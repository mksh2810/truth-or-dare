# RISKS REGISTER

| ID | Risk | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| R-01 | Missing `/docs/design/reference.png` | Low | UX builds from detailed Section 6 specs and Evening Table tokens | UX | Mitigated |
| R-02 | No real Gemini API key locally | Medium | Mock LLM adapter + deterministic filter; `llm_judge_enabled=false` default | AI | Mitigated |
| R-03 | Firestore free tier write limit (20k/day) | High | Split docs, narrow listeners, <=300 writes/10-turn game, quota alerts at 60%/80% | ARCH/OPS | Active |
| R-04 | Unreviewed legal policies | High | Labelled `DRAFT - NOT LEGALLY REVIEWED`; `PRIVATE_BETA=true` + `noindex` | LEG/OPS | Mitigated |
| R-05 | Clock skew on player devices | Medium | Server `deadlineAt` + RTDB/server clock offset estimate | FE1/BE | Active |
| R-06 | In-app browser (Instagram/WhatsApp) blocking PWA/WebRTC | Medium | In-app browser detector + "Open in browser" help screen | FE1 | Active |
