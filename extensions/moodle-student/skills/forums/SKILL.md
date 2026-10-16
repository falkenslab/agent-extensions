---
name: forums
description: Take part in a Moodle course's forums as a student with moodle-mcp - read threads whole, check a question hasn't been asked already, find the right forum, post or reply exactly once with the person's yes, edit within the allowed time, subscriptions and ratings, and write to the teacher privately. Use whenever the person reads, asks, replies or posts in a Moodle forum, or wants to write to their teacher.
---

# Forums as a student

What to say is the person's (or comes from the agent's study knowledge); this skill is how to read and post in Moodle without losing, misplacing or doubling a message. Every post is public to the course, in the person's name.

## Reading

- The course's forums are in `get_course_structure` (type `forum`). The announcements forum is the teacher's: students usually can't post there.
- `list_discussions`: subject, author, last post and number of replies. `get_discussion`: every post, oldest first, with the post each replies to. Read the whole thread before replying.
- Classmates may appear as aliases, and names in their texts redacted: use them as given.

## Before asking

- **Has it been asked?** Look through the forum's discussions first: replying in an existing thread beats a new duplicate.
- **Where**: a general or questions forum ("Dudas", "Questions", "General"), or the forum of the activity it's about. When none fits, say so instead of posting it in an unrelated forum.

## Posting, once

1. **The text first, approved**: show the person exactly what will be posted and where (which forum, or which post it answers).
2. **Post it**: `create_discussion` (a new thread) or `reply_to_post` (to a post, by its id). Images in `embed`, files in `files`.
3. **Check before any retry**: the tool returns the new post's id. If it fails or times out, `get_discussion` first, and retry once only if the post isn't there.

## After posting

- `edit_post` changes the person's own post, only within the site's editing time (usually 30 minutes); after that, a correction is a new reply.
- `delete_post` deletes it (and its replies): only the person's own, while Moodle allows it.
- `set_discussion_subscription`: whether Moodle emails the person new posts in a thread, useful to know when the question is answered.
- `rate`: a rating on a post, when the forum uses ratings.

## Writing to the teacher

A question about the person's own situation (an extension, a grade, a personal matter) goes privately: `send_message` to the teacher (from `list_participants`, by role), confirmed text and recipient. `list_conversations` and `get_conversation` read the replies.
