# User Prompt Template — Document Analysis AI

> This is what gets sent in the `user` role of each Claude API call.
> Replace `{{DOCUMENT_TEXT}}` with the extracted text of the document to analyze.
> Replace `{{CURRENT_DATE}}` with today's date so the model can evaluate deadlines accurately.

---

```
Today's date is {{CURRENT_DATE}}.

Please analyze the following document text and provide your full structured analysis.

---

DOCUMENT TEXT:
{{DOCUMENT_TEXT}}
```

---

## Integration Notes

### API Call Structure (Anthropic SDK)

```python
import anthropic
from datetime import date

client = anthropic.Anthropic(api_key="YOUR_API_KEY")

def analyze_document(document_text: str) -> str:
    system_prompt = open("system-prompt.txt").read()  # paste the system prompt contents here
    today = date.today().strftime("%B %d, %Y")  # e.g. "March 03, 2026"

    user_message = f"""Today's date is {today}.

Please analyze the following document text and provide your full structured analysis.

---

DOCUMENT TEXT:
{document_text}"""

    response = client.messages.create(
        model="claude-opus-4-5",   # or claude-sonnet-4-5 for faster/cheaper calls
        max_tokens=1024,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_message}
        ]
    )

    return response.content[0].text
```

### Tips

- **Current date matters**: Always inject today's date so the model can correctly determine whether deadlines have passed (CRITICAL) or are upcoming (HIGH/MEDIUM).
- **Clean the text first**: If using OCR, strip out headers/footers, page numbers, and watermarks before passing the text. Noise reduces confidence accuracy.
- **Token budget**: A typical document analysis response is 400–700 tokens. `max_tokens=1024` is a safe ceiling.
- **Model choice**:
  - `claude-opus-4-5` — highest accuracy, best for complex or ambiguous documents
  - `claude-sonnet-4-5` — faster and cheaper, good for high-volume pipelines where most documents are straightforward
