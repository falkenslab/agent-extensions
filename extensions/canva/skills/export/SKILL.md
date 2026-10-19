---
name: export
description: Export the person's Canva designs through Canva's official MCP server - which format for which use (PDF to print, PNG or JPG for images, PPTX for slides, MP4 or GIF for video, CSV for data), the Free plan's quality, premium elements, and that the download link expires. Use when the person wants a design as a file, to print, to put in a course or to send.
---

# Exporting from Canva

1. **`get-export-formats`** says which formats this design can be exported to: check it before promising one.
2. **Pick the format for the use**, and say why:
   - **PDF** to print or to hand out (a worksheet, a poster), or to upload to a course as a document;
   - **PNG** for an image with sharp text or a transparent background (transparency and lossless PNG need Canva Pro), **JPG** for a photo-like image that should be light;
   - **PPTX** for slides the person will edit in PowerPoint or Google Slides (some effects and fonts change on the way);
   - **MP4** for a video or an animated presentation, **GIF** for a short loop;
   - **CSV** for a design's data.
3. **`export-design`** doesn't change the design: it generates a file and gives a download link. Exporting needs no yes, but say what will be exported (which pages, which format).

## After exporting

- **The download link expires**: download the file right away, to where the person said, and give them the file's path, not only the link. To publish it elsewhere (a course in Moodle with moodle-teacher, an email), use that file.
- **On a Free plan** the export is standard quality; Pro and above get Pro quality.
- **`license_required`** means the design has premium elements the plan doesn't cover: say which, and offer to replace them with free ones (`edit-design`, see `designs`) before exporting again.
