#!/bin/sh
# Local development only: prints the newest sign-in link sent to an address in the local Mailpit inbox.
# Usage: sh scripts/mail-link.sh founder@example.com
curl -s "http://127.0.0.1:54324/api/v1/search?query=to:$1" | python3 -c "
import sys, json, re, html, urllib.request
msgs = json.load(sys.stdin).get('messages') or []
if not msgs: sys.exit('No email for that address yet.')
m = json.load(urllib.request.urlopen('http://127.0.0.1:54324/api/v1/message/' + msgs[0]['ID']))
print(re.findall(r'href=\"([^\"]+)\"', html.unescape(m['HTML']))[0])"
