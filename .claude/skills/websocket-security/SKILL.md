---
name: websocket-security
description: "Verify WebSocket handshake and message authorization with owned accounts."
---

# Verify WebSocket Security

## When to use

Use for in-scope WebSocket channels that carry authenticated events, commands, or tenant data. The HTTP handshake is only one boundary; messages may need separate authorization and session revocation.

## Low-impact workflow

1. Record an ordinary connection with a dedicated test account, approved origin, and one harmless subscribed resource. Identify the expected origin, authentication, and per-message rules.
2. Compare one connection from an assessment-controlled unapproved browser origin and one unauthenticated connection. Observe whether that browser can read a private test event; a successful handshake alone is not a finding.
3. With two owned roles, send one benign message or subscription request that should be denied to the lower role. Change only the role or resource identifier.
4. Revoke the test session and observe whether the existing connection loses protected access within the documented window. Avoid many open sockets or repeated messages.

## Confirmation and false positives

Confirm when an unintended origin can read private test events under the relevant cookie policy, an unauthorized test role receives or changes protected data, or a revoked session retains access beyond policy. A handshake `101`, public broadcast, or delayed revocation within an accepted grace period is insufficient. Check whether authentication occurs on the first message.

## Report and stop

Report the channel, origin and account state, single message, expected boundary, and redacted event evidence. Stop after one confirmed failure. Do not flood connections, subscribe to real users' channels, or retain session secrets.

## References

- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
