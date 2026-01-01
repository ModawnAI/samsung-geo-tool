#!/bin/bash

# Test the GEO v2 pipeline with a real request
echo "🧪 Testing GEO v2 Pipeline..."

# Sample SRT content (simplified)
SRT_CONTENT="1
00:00:00,000 --> 00:00:05,000
Introducing the all-new Galaxy S25 Ultra.

2
00:00:05,000 --> 00:00:12,000
Featuring a stunning 200 megapixel camera with AI-powered photo editing.

3
00:00:12,000 --> 00:00:20,000
The titanium frame provides ultimate durability with Corning Gorilla Armor 2.

4
00:00:20,000 --> 00:00:30,000
Experience Galaxy AI with Live Translate, Circle to Search, and more.

5
00:00:30,000 --> 00:00:40,000
All-day battery life with 5000mAh and 45W super fast charging.

6
00:00:40,000 --> 00:00:50,000
The S Pen is now more responsive than ever for note-taking and sketching.

7
00:00:50,000 --> 00:01:00,000
Available now. Galaxy S25 Ultra - Do What You Can't."

# Create JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "productName": "Galaxy S25 Ultra",
  "youtubeUrl": "https://youtube.com/watch?v=test123",
  "srtContent": $(echo "$SRT_CONTENT" | jq -Rs .),
  "existingDescription": "",
  "keywords": ["Galaxy S25 Ultra", "Samsung", "200MP camera", "titanium frame", "Galaxy AI"],
  "productCategory": "smartphone",
  "usePlaybook": false,
  "launchDate": null,
  "pipelineConfig": {
    "weights": "balanced",
    "stages": {
      "description": true,
      "chapters": true,
      "faq": true,
      "stepByStep": false,
      "caseStudies": false,
      "keywords": true,
      "hashtags": true
    }
  },
  "language": "en"
}
EOF
)

echo ""
echo "📤 Sending request to http://localhost:3000/api/generate-v2"
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST http://localhost:3000/api/generate-v2 \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  --max-time 120)

# Check if successful
if [ $? -ne 0 ]; then
  echo "❌ API call failed"
  exit 1
fi

# Parse response
echo "📥 Response received!"
echo ""

# Check for error
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
if [ -n "$ERROR" ]; then
  echo "❌ API returned error: $ERROR"
  echo "Full response:"
  echo "$RESPONSE" | jq .
  exit 1
fi

# Extract and display key fields
echo "=== DESCRIPTION ==="
echo "$RESPONSE" | jq -r '.description.preview // "NO PREVIEW"'
echo ""
echo "Full (first 300 chars):"
echo "$RESPONSE" | jq -r '.description.full // "NO FULL" | .[0:300]'
echo ""

echo "=== CHAPTERS ==="
echo "$RESPONSE" | jq -r '.chapters.timestamps // "NO TIMESTAMPS"'
echo ""

echo "=== FAQ ==="
FAQ_COUNT=$(echo "$RESPONSE" | jq '.faq.faqs | length // 0')
echo "FAQ Count: $FAQ_COUNT"
if [ "$FAQ_COUNT" -gt 0 ]; then
  echo "First FAQ:"
  echo "$RESPONSE" | jq -r '.faq.faqs[0].question // "N/A"'
fi
echo ""

echo "=== KEYWORDS ==="
echo "Product Keywords: $(echo "$RESPONSE" | jq -r '.keywords.product | join(", ") // "NONE"')"
echo "Generic Keywords: $(echo "$RESPONSE" | jq -r '.keywords.generic | join(", ") // "NONE"')"
echo ""

echo "=== HASHTAGS ==="
echo "$RESPONSE" | jq -r '.hashtags.tags | join(" ") // "NONE"'
echo ""

echo "=== QUALITY SCORES ==="
echo "$RESPONSE" | jq '.qualityScores // "NO SCORES"'
echo ""

echo "✅ Test complete!"
