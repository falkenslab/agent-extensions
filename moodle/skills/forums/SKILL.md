---
name: forums
description: Work a Moodle course's forums with moodle-mcp - find what's unanswered, read whole threads, reply or post announcements exactly once, edit or delete a post, pin and lock discussions, subscriptions, ratings and messages to several participants. Use whenever reading, answering or posting in a Moodle forum, or writing to the class.
---

# Forums in Moodle

Whether to step in and what to say is the person's call (or comes from the agent's teaching knowledge); this skill is how to read and post in Moodle without losing or doubling a message.

## Reading

- The course's forums are in `get_course_structure` (type `forum`); the announcements forum is the course's news forum.
- `list_discussions`: each discussion with its last post and its number of replies; `0` replies is unanswered. Locked ones say so.
- `get_discussion`: every post, oldest first, with the post each replies to. Read the whole thread before replying: someone may have answered already.
- Authors are aliases; names in the texts are redacted. Never try to find out who an alias is.

## Posting, once

1. **The text first, approved.** Show the person exactly what will be posted, and where (which discussion, which post it answers). No aliases in it: address the student as "you" (moodle-mcp refuses text with an alias).
2. **Post it**: `reply_to_post` (to a post, by its id) or `create_discussion` (a new thread; in the announcements forum, an announcement to the whole class). Images in `embed`, files in `files`.
3. **Check before any retry.** The tool returns the new post's id. If it fails or times out, `get_discussion` first: only if the post isn't there, retry once with the same approved text. Retrying without checking is how a student gets the reply twice.

## Announcements

An announcement reaches everyone, usually by email too. It goes in the course's announcements forum; if the course has none, say so and offer to create one (`create_activity`, type `forum`, in section 0) rather than posting it in a discussion forum. One subject each; a deadline or a change in the first sentence. For one student's situation, a private message (`send_message`), not an announcement. `message_participants` writes to several at once (by role, by group, or those inactive since a date); confirm the recipients and the text.

## Moderating

- `edit_post`: subject, message, attachments; the author within the site's editing time, or a moderator.
- `delete_post` takes the post's replies with it, and a discussion's first post takes the whole discussion: name what goes when asking.
- `set_discussion_state`: pin (stays on top) or lock (no more replies). `set_discussion_subscription`: whether the person gets new posts by email.
- `rate`: a post's rating, when the forum uses ratings; students may see it.
- Whole-forum grades: `get_forum_grades` and `grade_forum_user` (see `grading`).

## Good practice

- Plain HTML in messages: paragraphs, lists, `<pre><code>` for code. Moodle shows it as written.
- Several threads circling the same question point at the course, not at the students: tell the person, without names.
