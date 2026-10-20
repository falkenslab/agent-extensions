---
name: images
description: Images for the person's Canva designs through Canva's official MCP server - generating or editing one from a description, removing a background, separating a flat image into editable layers, uploading the person's files to Canva and reading a design's images - with what needs their yes and what never to upload. Use when the person asks for a picture, an illustration, a background removed or a file of theirs in a Canva design.
---

# Images in Canva

Every tool here puts something new in the person's Canva account; only `get-assets` just reads. So each one waits for the person's yes, asked as `designs` says ("The yes before creating or changing"): what will be made or uploaded, then a yes-or-no question. Picking a style or an option isn't that yes.

## Generating and editing

- **`generate-image`** generates an image, or edits one, from a description. Agree on the subject, the style and the size first; it runs as a job, so follow it with `get-generate-image-job`. Never ask it for a real person's likeness, another organisation's logo or anything presented as a real photo.
- **`remove-background`** makes a new image without the background; the original stays.
- **`separate-image-layers`** turns a flat image into a design with layers that can be edited; follow it with `get-separate-image-layers-job`.

## Bringing files in

- **`upload-asset-from-url`** imports an image or video from a public address. **`create-upload-url`** prepares an address to upload a file to.
- Only files the person chose to put in Canva: never a photo of students, a document with other people's data or anything they didn't name (see `what-goes-to-canva`).
- A video made with Claude Motion: `import-claude-motion-from-url`, then `get-motion-import-job-status` until it's in.

## Reading

`get-assets` gives the data and thumbnail of a design's images and videos: use it to describe them or to pick which one to change before `edit-design` (see `designs`).
