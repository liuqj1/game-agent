# game-agent
## Jimeng API

A minimal dependency-free client is provided in `jimeng_api.py`.

Env vars:
- JIMENG_API_KEY
- JIMENG_BASE_URL
- JIMENG_IMAGE_ENDPOINT  (example: /v1/images/generations)

Example:
- `python jimeng_api.py "a cute cat in cyberpunk style"`

Note: replace `JIMENG_IMAGE_ENDPOINT` and payload fields to match your Jimeng API docs.
