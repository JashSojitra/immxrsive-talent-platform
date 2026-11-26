# Publishing updates and student stories

Sign in to the Staff / Admin Portal and choose **Updates & Stories**. Curators can review posts; an XR admin or platform super administrator can create and publish them.

1. Choose **Create post**. Add a title. The address slug is generated automatically; edit it before sharing the address if needed.
2. Choose Student stories, Events or News. Write a short excerpt (200 characters maximum), your public author name and the full post in Markdown. The preview updates as you type.
3. Upload a JPG, PNG or WebP cover (up to 8 MB) and describe it in the cover alt text. **Insert image** uploads an inline image and adds Markdown at the end of the body: replace “Describe this image” with a useful description. Images are converted to WebP and camera/location metadata is removed. Do not upload private or unapproved photos. Uploaded media has a public, permanent address; removing it from a post does not erase cached copies.
4. For events, add the event name, date and location. Add comma-separated tags if useful. Put an HTTPS YouTube watch/share link on its own line to embed a privacy-enhanced player. Raw HTML is disabled.
5. **Save draft** keeps the post private. **Send to review** marks it for staff review. The list supports category/status filters and title search.
6. For a student story, paste the ID from the end of the student's portfolio URL. Choose **Request student approval**. The student sees the full saved revision in **Stories about you** on their dashboard. They can approve or ask for changes with a note. Their note appears in your list and editor. Edits to the title, excerpt, body, cover or linked student clear approval; request it again after editing.
7. **Publish** makes a complete post visible on Updates, its article page, RSS and the sitemap. A student story also needs the student's approval of this revision and a currently published portfolio. Staff cannot approve on a student's behalf. If the portfolio becomes private, the story is hidden from public readers.

**Unpublish** returns the post to draft. **Archive** removes it from public lists. Publication and review actions are recorded in the activity ledger. If another person edits while you are working, reload and reconcile the latest revision before saving.

Students can add, replace or remove their photo above the profile editor after saving a private profile. Choose a crop position and review the round preview before uploading. Reload the editor after changing a photo so other edits use the latest revision.

## Operator notes

Apply the committed Drizzle migration through the normal reviewed deployment process before deploying application code. This feature stores image bytes in PostgreSQL and uses no additional storage service. `SITE_URL` controls canonical links, RSS and sitemap URLs; it defaults to the production Vercel URL. Do not point automated tests or development migrations at production.
