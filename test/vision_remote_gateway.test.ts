// =========================================================================
// VISION Remote Gateway — Integration & Protocol Verification Suite
// =========================================================================

import { WebSocket } from 'ws';
import { PairingManager } from '../src/gateway/PairingManager';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { RemoteBridge } from '../src/gateway/RemoteBridge';
import { SessionHub } from '../src/gateway/SessionHub';
import { REMOTE_PROTOCOL_VERSION, RemoteMessage } from '../src/shared/remoteProtocol';
import fs from 'fs';
import path from 'path';

async function runGatewayTests() {
  console.log('====================================================');
  console.log('🧪 VISION REMOTE GATEWAY & PROTOCOL V1 TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] Test ${total}: ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${testName}`);
      if (detail) console.error(`   └─ ${detail}`);
      process.exitCode = 1;
    }
  }

  // Temporary test storage for pairing
  const tempStorage = path.join(process.cwd(), 'test_trusted_devices.json');
  if (fs.existsSync(tempStorage)) fs.unlinkSync(tempStorage);

  const testPairingManager = new PairingManager(tempStorage);

  // -------------------------------------------------------------------------
  // TEST 1: Pairing Manager PIN Generation & Expiration
  // -------------------------------------------------------------------------
  console.log('--- Test 1: PIN Generation & Format ---');
  const pin = testPairingManager.generatePairingCode();
  assert(
    typeof pin === 'string' && pin.length === 6 && /^\d{6}$/.test(pin),
    '6-digit PIN Generation',
    `Generated PIN: ${pin}`
  );

  const active = testPairingManager.getActivePairingCode();
  assert(
    active !== null && active.code === pin && active.expiresInSeconds > 0,
    'Active PIN retrieval & remaining seconds countdown',
    `Expires in: ${active?.expiresInSeconds}s`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Device Pairing Handshake & Token Issuance
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Pairing Handshake ---');
  // Rejection with incorrect code
  const badPair = testPairingManager.pairDevice({
    deviceId: 'phone_001',
    deviceName: 'Ahmed S24 Ultra',
    platform: 'android',
    pairingCode: '000000',
  });
  assert(!badPair.success, 'Reject incorrect pairing PIN', `Error: ${badPair.error}`);

  // Acceptance with correct code
  const goodPair = testPairingManager.pairDevice({
    deviceId: 'phone_001',
    deviceName: 'Ahmed S24 Ultra',
    platform: 'android',
    pairingCode: pin,
  });
  assert(
    goodPair.success && !!goodPair.authToken && goodPair.authToken.startsWith('vrt_'),
    'Successful device pairing and token generation',
    `Bearer Token: ${goodPair.authToken?.substring(0, 12)}...`
  );

  const isVerified = testPairingManager.verifyDevice('phone_001', goodPair.authToken!);
  assert(isVerified, 'Verify trusted device with issued bearer token');

  // Once used, the PIN must be invalidated
  const reusePair = testPairingManager.pairDevice({
    deviceId: 'phone_002',
    deviceName: 'Unknown Phone',
    platform: 'android',
    pairingCode: pin,
  });
  assert(!reusePair.success, 'Pairing code cannot be reused once claimed');

  // -------------------------------------------------------------------------
  // TEST 3: Gateway Server HTTP & REST Endpoints
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Gateway HTTP REST Endpoints ---');
  const testGateway = new GatewayServer();
  // Override port for testing to 8999
  (testGateway as any).port = 8999;
  await testGateway.start();

  try {
    // 3.1 GET /api/discovery
    const discRes = await fetch('http://127.0.0.1:8999/api/discovery');
    const discJson = await discRes.json();
    assert(
      discRes.status === 200 && discJson.status === 'ONLINE' && discJson.version === '1.0',
      'GET /api/discovery returns system identity and network status',
      `Hostname: ${discJson.hostname}, IP: ${discJson.ip}`
    );

    // 3.2 GET /api/status without auth should fail
    const unauthStatus = await fetch('http://127.0.0.1:8999/api/status');
    assert(unauthStatus.status === 401, 'GET /api/status blocks unauthenticated requests');

    // -------------------------------------------------------------------------
    // TEST 4: WebSocket Connection, Auth Handshake & Real-Time Event Stream
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: WebSocket Protocol v1 Lifecycle ---');
    const ws = new WebSocket('ws://127.0.0.1:8999/ws');

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    assert(ws.readyState === WebSocket.OPEN, 'WebSocket successfully connected to Gateway :8999/ws');

    const receivedMessages: RemoteMessage[] = [];
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        receivedMessages.push(msg);
      } catch {}
    });

    // 4.1 Send Keepalive Ping
    ws.send(JSON.stringify({
      id: 'm1',
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type: 'ping',
      payload: {},
    }));

    // Expect auth error because unauthenticated ping
    await new Promise((r) => setTimeout(r, 200));
    assert(
      receivedMessages.some((m) => m.type === 'auth_error'),
      'Unauthenticated message receives auth_error prompt'
    );

    // 4.2 Authenticate with paired device
    // Register token in gateway's pairing manager
    const newCode = (testGateway as any).port ? '654321' : '654321';
    // Generate code on gateway
    const genRes = await fetch('http://127.0.0.1:8999/api/pairing-code/generate', { method: 'POST' });
    const genJson = await genRes.json();
    const livePin = genJson.code;

    const pairRes = await fetch('http://127.0.0.1:8999/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'pixel_9_pro',
        deviceName: "Ahmed's Pixel 9 Pro",
        platform: 'android',
        pairingCode: livePin,
      }),
    });
    const pairData = await pairRes.json();
    assert(pairData.success && !!pairData.authToken, 'HTTP /api/pair successfully exchanged live PIN for token');

    // Authenticate WS with the token
    ws.send(JSON.stringify({
      id: 'auth_msg',
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type: 'auth_request',
      payload: {
        deviceId: 'pixel_9_pro',
        authToken: pairData.authToken,
      },
    }));

    await new Promise((r) => setTimeout(r, 300));
    const authSuccessMsg = receivedMessages.find((m) => m.type === 'auth_response');
    assert(
      authSuccessMsg !== undefined && authSuccessMsg.payload.authenticated === true,
      'WebSocket Authentication accepted and session established',
      `System: ${authSuccessMsg?.payload.systemName}`
    );

    // 4.3 Authenticated Ping -> Pong
    ws.send(JSON.stringify({
      id: 'm_ping',
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type: 'ping',
      payload: {},
    }));

    await new Promise((r) => setTimeout(r, 200));
    assert(
      receivedMessages.some((m) => m.type === 'pong'),
      'Authenticated keepalive ping receives pong'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Command Dispatch & Event Streaming to Mobile
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Command Dispatch & Live Stream ---');
    let capturedCmd = '';
    const bridge = (await import('../src/gateway/RemoteBridge')).remoteBridge;
    bridge.registerDesktopCommandHandler(async (cmd) => {
      capturedCmd = cmd;
    });

    ws.send(JSON.stringify({
      id: 'cmd_1',
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type: 'user_message',
      payload: { text: 'VISION افتح VS Code' },
    }));

    await new Promise((r) => setTimeout(r, 200));
    assert(
      capturedCmd === 'VISION افتح VS Code',
      'Mobile user message routed into Desktop Command Handler'
    );

    assert(
      receivedMessages.some((m) => m.type === 'task_created'),
      'Gateway broadcast task_created back to connected mobile'
    );

    // Test Agent narration and step broadcast
    const activeTask = bridge.getActiveTask();
    if (activeTask) {
      bridge.notifyNarration('جاري فتح برنامج VS Code يا أحمد...', true, activeTask.id);
      bridge.notifyTaskStep(activeTask.id, {
        stepId: 'step_1',
        type: 'tool_selection',
        toolName: 'app_control_tool',
        status: 'pending',
        message: 'Selected app_control_tool (action=launch, app_name=code)',
        timestamp: '12:00:00',
      });
      bridge.notifyTaskProgress(activeTask.id, 65, 'Launching VS Code process');
    }

    await new Promise((r) => setTimeout(r, 200));
    assert(
      receivedMessages.some((m) => m.type === 'agent_narrate'),
      'Spoken voice narration streamed live to mobile'
    );
    assert(
      receivedMessages.some((m) => m.type === 'task_step'),
      'Agent tool execution step streamed live to mobile'
    );
    assert(
      receivedMessages.some((m) => m.type === 'task_progress'),
      'Task progress percent and activity streamed live to mobile'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Emergency STOP (Kill Switch) from Mobile
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Mobile STOP / Kill Switch ---');
    ws.send(JSON.stringify({
      id: 'stop_msg',
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type: 'task_cancel',
      payload: { taskId: activeTask?.id },
    }));

    await new Promise((r) => setTimeout(r, 200));
    assert(
      activeTask?.status === 'CANCELLED',
      'Task cancelled immediately when STOP is triggered from mobile'
    );

    ws.close();
  } finally {
    await testGateway.stop();
    if (fs.existsSync(tempStorage)) fs.unlinkSync(tempStorage);
  }

  console.log('\n====================================================');
  console.log(`🏁 GATEWAY TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('====================================================\n');
}

runGatewayTests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
