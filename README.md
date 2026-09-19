# WiFi Target Bot v3

Minimal flow:

1. `/start`
2. User sends Wi-Fi SSID
3. Target locks automatically
4. Operation starts automatically
5. Bot selects an owner-recovery route available from iPhone

No dashboard, audit, reports, password lab, or extra menus.

The Telegram/Cloudflare backend cannot access the iPhone Wi-Fi radio, capture WPA handshakes, or read iOS saved credentials remotely. Recovery steps are therefore limited to the user's own/authorized network and local owner-access paths.
