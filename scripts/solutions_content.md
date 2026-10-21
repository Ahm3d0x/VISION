# Cryptography & Data Security — Problem Set 2
### Comprehensive Solutions & Mathematical Proofs
**Prepared by:** VISION Personal AI Operating System  
**Recipient:** Ahmed Mohamed Attia  
**Topics:** One-Time Pad (OTP), Perfect Secrecy, Block Ciphers (DES / 3DES / AES), and Pseudorandom Generators (PRG)

---

### M1. OTP Encryption
**Problem Statement:**
Encrypt the 8-bit plaintext message $m = 10110010_2$ with the secret key $k = 01101101_2$ using the One-Time Pad (Vernam Cipher).

**Mathematical Formulation:**
In the One-Time Pad, encryption is computed as the bitwise exclusive-OR (XOR) of the plaintext and the key:
$$c = E(k, m) = m \oplus k$$

**Bitwise Truth Table & Evaluation:**
| Bit Position | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 | Hex Representation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Plaintext ($m$)** | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | `0xB2` |
| **Key ($k$)** | 0 | 1 | 1 | 0 | 1 | 1 | 0 | 1 | `0x6D` |
| **Ciphertext ($c = m \oplus k$)** | **1** | **1** | **0** | **1** | **1** | **1** | **1** | **1** | `0xDF` |

**Final Answer:**
$$c = \mathbf{11011111_2} \quad (\text{Hex: } \mathbf{0xDF})$$

---

### M2. OTP Decryption
**Problem Statement:**
The ciphertext $c = 01011110_2$ was produced with the key $k = 11001010_2$. Recover the original plaintext message $m$.

**Mathematical Formulation:**
Because XOR is its own inverse ($x \oplus x = 0$ and $x \oplus 0 = x$), decryption in the One-Time Pad is identical to encryption:
$$m = D(k, c) = c \oplus k$$

**Bitwise Evaluation:**
| Bit Position | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 | Hex Representation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Ciphertext ($c$)** | 0 | 1 | 0 | 1 | 1 | 1 | 1 | 0 | `0x5E` |
| **Key ($k$)** | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | `0xCA` |
| **Recovered Plaintext ($m$)** | **1** | **0** | **0** | **1** | **0** | **1** | **0** | **0** | `0x94` |

**Final Answer:**
$$m = \mathbf{10010100_2} \quad (\text{Hex: } \mathbf{0x94})$$

---

### M3. Key Recovery & The Dangers of Key Reuse
**Problem Statement:**
An attacker knows the plaintext $m = 11001100_2$ and the ciphertext $c = 10100000_2$ of an OTP message.
1. Find the secret key $k$.
2. What fundamental cryptographic lesson does this provide regarding key reuse?

**1. Mathematical Key Recovery:**
Since $c = m \oplus k$, XORing both sides with $m$ yields:
$$k = m \oplus c$$

| Bit Position | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 | Hex Representation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Plaintext ($m$)** | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | `0xCC` |
| **Ciphertext ($c$)** | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | `0xA0` |
| **Recovered Key ($k = m \oplus c$)** | **0** | **1** | **1** | **0** | **1** | **1** | **0** | **0** | `0x6C` |

$$k = \mathbf{01101100_2} \quad (\text{Hex: } \mathbf{0x6C})$$

**2. Cryptographic Lesson:**
- **Zero Computational Margin in Known-Plaintext Attacks:** Under a Known-Plaintext Attack (KPA), OTP offers zero resistance; the key is exposed instantly with a single XOR operation.
- **Catastrophic Failure of Key Reuse:** The One-Time Pad is called *One-Time* because keys must be consumed and discarded immediately. Reusing $k$ even once allows an adversary who learns any single message to decrypt all other messages encrypted under that same key, completely destroying perfect secrecy.

---

### M4. Two-Time Pad Attack (Key Cancellation Proof)
**Problem Statement:**
Two messages $m_1 = 11001100_2$ and $m_2 = 10101010_2$ are both encrypted with the same key $k = 01101100_2$.
1. Compute the ciphertexts $c_1$ and $c_2$.
2. Prove algebraically and numerically that $c_1 \oplus c_2 = m_1 \oplus m_2$ (i.e., the key cancels out).

**1. Ciphertext Calculations:**
- $c_1 = m_1 \oplus k = 11001100_2 \oplus 01101100_2 = \mathbf{10100000_2}$ (`0xA0`)
- $c_2 = m_2 \oplus k = 10101010_2 \oplus 01101100_2 = \mathbf{11000110_2}$ (`0xC6`)

**2. Proof of Key Cancellation:**
**Algebraic Proof:**
Using the associative and commutative properties of XOR, and the identity $x \oplus x = 0$:
$$c_1 \oplus c_2 = (m_1 \oplus k) \oplus (m_2 \oplus k) = m_1 \oplus m_2 \oplus (k \oplus k) = m_1 \oplus m_2 \oplus 0 = \mathbf{m_1 \oplus m_2}$$

**Numerical Verification:**
- $c_1 \oplus c_2 = 10100000_2 \oplus 11000110_2 = \mathbf{01100110_2}$ (`0x66`)
- $m_1 \oplus m_2 = 11001100_2 \oplus 10101010_2 = \mathbf{01100110_2}$ (`0x66`)

$$\therefore c_1 \oplus c_2 = m_1 \oplus m_2 = \mathbf{01100110_2} \quad (\text{Q.E.D.})$$

**Practical Impact:**
An eavesdropper seeing $c_1$ and $c_2$ computes $c_1 \oplus c_2 = m_1 \oplus m_2$. Using natural language frequency analysis or "crib-dragging", the attacker can easily recover both plaintexts without ever knowing the key $k$.

---

### M5. Perfect Secrecy for 1-Bit OTP
**Problem Statement:**
Let the message space, ciphertext space, and key space be $\mathcal{M} = \mathcal{C} = \mathcal{K} = \{0, 1\}$ with encryption function $E(k, m) = k \oplus m$, where $k$ is chosen uniformly at random ($P(k = 0) = P(k = 1) = \frac{1}{2}$).
1. Complete the probability distribution table for $\Pr[E(k, m) = c]$.
2. Formally decide whether the cipher achieves Shannon Perfect Secrecy.

**1. Probability Table $\Pr[E(k, m) = c]$:**
- For $m = 0$:
  - $E(k, 0) = 0 \iff k \oplus 0 = 0 \iff k = 0 \implies \Pr[E(k, 0) = 0] = P(k = 0) = 0.5$
  - $E(k, 0) = 1 \iff k \oplus 0 = 1 \iff k = 1 \implies \Pr[E(k, 0) = 1] = P(k = 1) = 0.5$
- For $m = 1$:
  - $E(k, 1) = 0 \iff k \oplus 1 = 0 \iff k = 1 \implies \Pr[E(k, 1) = 0] = P(k = 1) = 0.5$
  - $E(k, 1) = 1 \iff k \oplus 1 = 1 \iff k = 0 \implies \Pr[E(k, 1) = 1] = P(k = 0) = 0.5$

| Plaintext Message ($m$) | $\Pr[C = 0 \mid M = m]$ | $\Pr[C = 1 \mid M = m]$ |
| :---: | :---: | :---: |
| **$m = 0$** | **0.5** ($\frac{1}{2}$) | **0.5** ($\frac{1}{2}$) |
| **$m = 1$** | **0.5** ($\frac{1}{2}$) | **0.5** ($\frac{1}{2}$) |

**2. Perfect Secrecy Decision:**
By Shannon's theorem, an encryption scheme achieves **Perfect Secrecy** if and only if for every pair of messages $m_0, m_1 \in \mathcal{M}$ and every ciphertext $c \in \mathcal{C}$:
$$\Pr[C = c \mid M = m_0] = \Pr[C = c \mid M = m_1] = \Pr[C = c]$$
Since $\Pr[C = c \mid M = 0] = \Pr[C = c \mid M = 1] = 0.5$ for all $c \in \{0, 1\}$, observing the ciphertext reveals zero statistical information about the plaintext.
$$\mathbf{\text{Conclusion: The 1-bit OTP possesses PERFECT SECRECY.}}$$

---

### M6. OTP Key Length & Combinatorial Key Space
**Problem Statement:**
An OTP message is 25 ASCII characters long. Each ASCII character is encoded in 8 bits.
1. How many bits must the OTP key be?
2. How many distinct possible OTP keys exist?

**1. Key Length in Bits:**
$$\text{Key Length} = 25\text{ characters} \times 8\text{ bits/character} = \mathbf{200\text{ bits}}$$

**2. Size of Key Space ($|\mathcal{K}|$):**
Since each bit is chosen independently and uniformly from $\{0, 1\}$:
$$|\mathcal{K}| = 2^{200}$$

**Decimal Approximation:**
$$2^{200} = (2^{10})^{20} = (1024)^{20} \approx (1.024 \times 10^3)^{20} \approx \mathbf{1.606938 \times 10^{60}\text{ possible keys}}$$

---

### M7. DES Exhaustive Key Search Time
**Problem Statement:**
A DES key is 56 bits long. Suppose an attacker possesses a specialized hardware cracking cluster capable of testing $10^9$ keys per second ($1\text{ GHz}$).
1. In the worst case, how long (in seconds, days, and years) does it take to search the entire DES key space?
2. What is the expected (average) time to discover the key?

**1. Worst-Case Time Analysis:**
The DES key space consists of $|\mathcal{K}| = 2^{56} = 72,057,594,037,927,936$ keys.
- **In Seconds:**
  $$T_{\text{worst}} = \frac{2^{56}}{10^9\text{ keys/s}} = 72,057,594.04\text{ seconds}$$
- **In Days:**
  $$T_{\text{worst}} = \frac{72,057,594.04}{86,400\text{ s/day}} \approx \mathbf{834.00\text{ days}}$$
- **In Years (using standard $365.25\text{ days/year}$):**
  $$T_{\text{worst}} = \frac{834.00}{365.25} \approx \mathbf{2.283\text{ years}} \quad (\approx 2\text{ years and } 104\text{ days})$$

**2. Expected (Average) Time:**
Assuming keys are selected uniformly, the correct key is found on average after inspecting half of the total key space ($\frac{2^{56}}{2} = 2^{55}$ keys):
- **In Seconds:** $T_{\text{avg}} = \frac{T_{\text{worst}}}{2} = \mathbf{36,028,797.02\text{ seconds}}$
- **In Days:** $T_{\text{avg}} \approx \mathbf{417.00\text{ days}}$
- **In Years:** $T_{\text{avg}} \approx \mathbf{1.142\text{ years}} \quad (\approx 1\text{ year and } 52\text{ days})$

---

### M8. Key Space Comparison: AES-128 vs. DES
**Problem Statement:**
AES-128 uses a 128-bit key, whereas DES uses a 56-bit key. How many times larger is the AES-128 key space compared to DES? Express your answer as an exact power of 2 and as an approximate decimal ratio.

**1. Exact Ratio as a Power of 2:**
$$\text{Ratio} = \frac{|\mathcal{K}_{\text{AES-128}}|}{|\mathcal{K}_{\text{DES}}|} = \frac{2^{128}}{2^{56}} = 2^{128 - 56} = \mathbf{2^{72}}$$

**2. Exact Decimal Value & Ratio:**
$$2^{72} = 4,722,366,482,869,645,213,696 \approx \mathbf{4.722 \times 10^{21}}$$

**Security Insight:**
AES-128 provides a search space that is over **$4.72\text{ sextillion}$ times larger** than DES. Even if the entire global computing power cracked $10^{18}$ keys/second, searching AES-128 would still require over $10^{13}$ years (exceeding the age of the universe).

---

### M9. Block Cipher Padding Calculations (PKCS#7)
**Problem Statement:**
A message of length 1,000 bytes is to be encrypted using standard PKCS#7 padding.
1. How many blocks are needed for **AES** (block size 128 bits = 16 bytes)?
2. How many blocks are needed for **3DES** (block size 64 bits = 8 bytes)?

**PKCS#7 Rule:**
If a message has length $L$ and the cipher has block size $B$ bytes, padding appends $p$ bytes ($1 \le p \le B$) such that $(L + p)$ is a positive multiple of $B$. If $L$ is already an exact multiple of $B$, a full dummy block of $B$ bytes is appended.

**1. AES Calculation ($B = 16\text{ bytes}$):**
- Remainder: $1000 \pmod{16} = 8$ bytes in the final partial block.
- Padding bytes added: $p = 16 - 8 = 8$ bytes (each with hex value `0x08`).
- Total padded length: $1000 + 8 = 1008$ bytes.
- Total blocks:
  $$\text{Blocks}_{\text{AES}} = \frac{1008}{16} = \mathbf{63\text{ blocks}}$$

**2. 3DES Calculation ($B = 8\text{ bytes}$):**
- Remainder: $1000 \pmod{8} = 0$ bytes (exact multiple).
- PKCS#7 Mandate: To prevent decoding ambiguity upon decryption, an entire additional block of $B = 8$ padding bytes (each with hex value `0x08`) must be appended.
- Total padded length: $1000 + 8 = 1008$ bytes.
- Total blocks:
  $$\text{Blocks}_{\text{3DES}} = \frac{1008}{8} = \mathbf{126\text{ blocks}}$$

---

### M10. Round Function Evaluations
**Problem Statement:**
Suppose a 100-block message is encrypted. How many round-function evaluations are performed in total for:
1. **AES-128** (10 rounds)?
2. **3DES** (48 rounds total)?

**1. AES-128:**
AES-128 applies 10 transformation rounds per block:
$$\text{Total Evaluations} = 100\text{ blocks} \times 10\text{ rounds/block} = \mathbf{1,000\text{ round-function evaluations}}$$

**2. 3DES (Triple DES - EDE Mode):**
3DES consists of three sequential DES stages (Encrypt $\rightarrow$ Decrypt $\rightarrow$ Encrypt). Each individual DES stage comprises 16 Feistel rounds:
$$\text{Rounds per block} = 16 \times 3 = 48\text{ rounds}$$
$$\text{Total Evaluations} = 100\text{ blocks} \times 48\text{ rounds/block} = \mathbf{4,800\text{ round-function evaluations}}$$

---

### M11. Pseudorandom Generator (PRG) Predictability
**Problem Statement:**
A pseudorandom generator $G$ has output length 128 bits. The security threshold for an adversary's advantage is set to:
$$\varepsilon = \frac{1}{2^{30}} \approx 9.3132 \times 10^{-10}$$
Suppose an adversary predicts the next bit with probability:
- **Case (a):** $P_a = 0.5001$
- **Case (b):** $P_b = \frac{1}{2} + 2^{-40}$

In each case, decide whether the generator is considered **predictable** or **unpredictable** under this threshold.

**Definition of Adversary Advantage:**
The advantage of an adversary in next-bit prediction is defined as:
$$\operatorname{Adv} = \left| P(\text{predict}) - \frac{1}{2} \right|$$
- If $\operatorname{Adv} > \varepsilon \implies$ The PRG is **PREDICTABLE** (Insecure).
- If $\operatorname{Adv} \le \varepsilon \implies$ The PRG is **NOT PREDICTABLE** (Secure).

**Case (a) Evaluation ($P_a = 0.5001$):**
$$\operatorname{Adv}_a = |0.5001 - 0.5| = 0.0001 = 10^{-4}$$
Let us compare $10^{-4}$ against $\varepsilon = 2^{-30}$:
$$\varepsilon = 2^{-30} = \frac{1}{1,073,741,824} \approx 9.3132 \times 10^{-10}$$
Clearly:
$$10^{-4} = 0.0001 \gg 9.3132 \times 10^{-10}$$
Since $\operatorname{Adv}_a > \varepsilon$, the adversary has an advantage substantially greater than the allowable security threshold.
$$\mathbf{\text{Verdict for (a): PREDICTABLE (Insecure under threshold }\varepsilon)}$$

**Case (b) Evaluation ($P_b = \frac{1}{2} + 2^{-40}$):**
$$\operatorname{Adv}_b = \left| \left( \frac{1}{2} + 2^{-40} \right) - \frac{1}{2} \right| = 2^{-40}$$
Comparing exponents with identical base:
$$2^{-40} = \frac{1}{2^{40}} < \frac{1}{2^{30}} = 2^{-30}$$
Numerically:
$$\operatorname{Adv}_b \approx 9.0949 \times 10^{-13} < 9.3132 \times 10^{-10} = \varepsilon$$
Since $\operatorname{Adv}_b < \varepsilon$, the adversary's predictive capability is strictly negligible with respect to the threshold.
$$\mathbf{\text{Verdict for (b): NOT PREDICTABLE (Secure under threshold }\varepsilon)}$$
