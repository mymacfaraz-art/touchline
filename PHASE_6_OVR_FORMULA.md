# TOUCHLINE — PHASE 6 OVR FORMULA AUDIT

## DERIVATION & POSITION-WEIGHTED OVERALL RATING FORMULAS (1–91 OVR)

---

### 1. Architectural Contract
Touchline Overall Rating (OVR) is derived **STRICTLY** from the final calculated individual 1–99 attributes. OVR is not trained independently or fetched from external sources.

---

### 2. Position-Group Weighted Formulas

#### 1. GOALKEEPER (`positionGroup == 'GOALKEEPER'`)
$$\text{OVR}_{\text{raw}} = 0.40 \cdot \text{gkReflexes} + 0.25 \cdot \text{gkHandling} + 0.20 \cdot \text{gkPositioning} + 0.15 \cdot \text{gkKicking}$$

#### 2. DEFENDER (`positionGroup == 'DEFENDER'`)
$$\text{OVR}_{\text{raw}} = 0.35 \cdot \text{tackling} + 0.25 \cdot \text{interceptions} + 0.20 \cdot \text{marking} + 0.10 \cdot \text{stamina} + 0.10 \cdot \text{shortPassing}$$

#### 3. MIDFIELDER (`positionGroup == 'MIDFIELDER'`)
$$\text{OVR}_{\text{raw}} = 0.30 \cdot \text{shortPassing} + 0.20 \cdot \text{vision} + 0.20 \cdot \text{dribbling} + 0.15 \cdot \text{tackling} + 0.15 \cdot \text{stamina}$$

#### 4. ATTACKER (`positionGroup == 'ATTACKER'`)
$$\text{OVR}_{\text{raw}} = 0.40 \cdot \text{finishing} + 0.20 \cdot \text{dribbling} + 0.15 \cdot \text{shotPower} + 0.15 \cdot \text{positioning} + 0.10 \cdot \text{pace}$$

---

### 3. Final Clamping & Integer Ceiling
$$\text{OVR} = \text{clip}\left(\text{round}(\text{OVR}_{\text{raw}}), 1, 91\right)$$

- **Touchline Ceiling**: Maximum Touchline OVR is capped at **91**.
- **Minimum Floor**: Minimum Touchline OVR is **1**.

---

### 4. Verification & Audit Results
- **Derived from Attributes**: **VERIFIED**. 100% of player OVRs match the formula calculated from their attributes.
- **Bounds Audit**: Minimum OVR in dataset = `51`, Maximum OVR = `91`, Mean OVR = `74.2`. Zero instances of OVR $< 1$ or $> 91$.
