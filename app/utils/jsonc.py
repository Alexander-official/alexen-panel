"""JSON that may carry comments: the plain (fast) parser first, commentjson
(slow, pure Python) only when the text really needs it."""
import json


def loads(text):
    try:
        return json.loads(text)
    except ValueError:
        import commentjson
        return commentjson.loads(text)
