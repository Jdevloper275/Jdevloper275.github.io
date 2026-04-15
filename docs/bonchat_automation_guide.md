# Beginner Guide: BonChat Code Auto-Paste to 5 Accounts (Android)

## 1) Goal
This setup lets your spare Android phone do the following:
- Listen for code messages from BonChat.
- Accept only valid 9-character alphanumeric codes.
- Work only during two time windows:
  - 11:55 AM to 12:15 PM
  - 5:55 PM to 6:15 PM
- Open each account URL, go to Futures -> Invited me, paste code, and press Confirm.
- Close browser tabs after each account to reduce memory use.
- Optionally wake phone at start and lock phone at end.

## 2) Requirements
- Android phone (your old Redmi is fine).
- Charger connected and internet always ON.
- Apps:
  1. Tasker
  2. AutoNotification
  3. AutoInput
  4. Chrome (or Kiwi Browser)

## 3) Phone settings (must do)
For Tasker, AutoNotification, AutoInput, and Chrome:
- Disable battery optimization.
- Enable Auto-start / background run.
- Allow notification access (AutoNotification).
- Allow accessibility service (AutoInput).

These settings are required, otherwise automation may stop in background.

## 4) Save account URLs
Prepare 5 URLs (one per account):
- URL1
- URL2
- URL3
- URL4
- URL5

Each URL should open with login already saved.

## 5) Tasker variables
Create these global variables:
- %listen = 0   (window OFF by default)
- %latest_code = (empty)
- %code_count = 0
- %target_url = (used when submitting each account)

## 6) Task: WINDOW_ON
Actions:
1. Set %listen = 1
2. Set %latest_code = empty
3. Set %code_count = 0
4. Notify: "Code window started"

## 7) Task: GET_CODE_FROM_BONCHAT
Use this task with AutoNotification Intercept.

Actions:
1. If %listen != 1 -> Stop
2. Set %msg = %antext
3. Regex extract: ([A-Za-z0-9]{9}) from %msg, store match in %m1
4. If %m1 is not valid -> Stop
5. Set %latest_code = %m1
6. Add 1 to %code_count
7. Notify captured code and count

This keeps the latest valid code when multiple messages arrive.

## 8) Profile: BonChat trigger
Create profile:
- Event -> Plugin -> AutoNotification Intercept
- App filter: BonChat
- Linked task: GET_CODE_FROM_BONCHAT

## 9) Task: SUBMIT_ONE_ACCOUNT
This task uses %target_url and %latest_code.

Actions:
1. Open %target_url in browser
2. Wait 4 sec
3. Tap Futures tab (AutoInput Easy Setup)
4. Wait 1 sec
5. Tap Invited me tab
6. Wait 1 sec
7. Tap input box ("Please enter the order code")
8. Type %latest_code
9. Wait 300 ms
10. Tap Confirm
11. Wait 2 sec
12. Open tab switcher and close current tab (memory cleanup)

## 10) Task: SUBMIT_ALL_5
Actions:
1. If %latest_code invalid -> notify and stop
2. Set %target_url = URL1 -> perform SUBMIT_ONE_ACCOUNT
3. Set %target_url = URL2 -> perform SUBMIT_ONE_ACCOUNT
4. Set %target_url = URL3 -> perform SUBMIT_ONE_ACCOUNT
5. Set %target_url = URL4 -> perform SUBMIT_ONE_ACCOUNT
6. Set %target_url = URL5 -> perform SUBMIT_ONE_ACCOUNT
7. Notify final done message

## 11) Task: WINDOW_OFF_AND_SUBMIT
Actions:
1. Set %listen = 0
2. Perform SUBMIT_ALL_5

## 12) Time profiles
Create 4 profiles:
1. 11:55 -> WINDOW_ON
2. 12:15 -> WINDOW_OFF_AND_SUBMIT
3. 17:55 -> WINDOW_ON
4. 18:15 -> WINDOW_OFF_AND_SUBMIT

This scans only your desired windows.

## 13) Optional wake + lock flow
If your phone uses swipe lock:
- At start of master task:
  1. Display On
  2. AutoInput swipe up to unlock
- At end:
  1. System Lock / screen off action

If PIN/password lock is enabled, full auto unlock may be restricted by Android security.

## 14) Testing checklist
- Send test BonChat message with sample code: A1B2C3D4E
- Confirm code capture notification appears.
- Confirm all 5 accounts run in sequence.
- Confirm tab closes each cycle.
- Confirm final success notification.

## 15) Reliability tips
- Keep fixed screen orientation and browser zoom.
- Avoid frequent app/browser updates (UI changes break tap positions).
- Re-record AutoInput taps after any UI change.
- Restart phone every 2-3 days.

## 16) Safety note
Only automate if your company/platform terms allow it.
Do not share passwords or OTP with any third-party app or person.
