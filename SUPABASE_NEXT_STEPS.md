1. Open Supabase SQL Editor.
2. Run the full contents of:
   C:\Users\JYJ\Documents\Codex\2026-05-15-company-homepage-multipage4\supabase-setup.sql

3. Open Edge Functions > board-api.
4. Replace the entire function code with:
   C:\Users\JYJ\Documents\Codex\2026-05-15-company-homepage-multipage4\supabase-board-api.ts
5. Deploy the function again.

6. Create another Edge Function named `inquiry-api`.
7. Replace the entire function code with:
   C:\Users\JYJ\Documents\Codex\2026-05-15-company-homepage-multipage4\supabase-inquiry-api.ts
8. In Supabase Edge Function secrets, add:
   `RESEND_API_KEY`
   `INQUIRY_NOTIFICATION_TO`
   `INQUIRY_NOTIFICATION_FROM`
   Optional: `INQUIRY_ATTACHMENT_BUCKET=board-attachments`
   Optional: `INQUIRY_EMAIL_ATTACHMENT_LIMIT_BYTES=9437184`
9. Deploy `inquiry-api` again after saving the secrets.

10. Open this page for admin use:
   C:\Users\JYJ\Documents\Codex\2026-05-15-company-homepage-multipage4\admin-board.html

11. Log in there with the admin email/password you created in Supabase Authentication.

Customer-facing pages:
- C:\Users\JYJ\Documents\Codex\2026-05-15-company-homepage-multipage4\quote.html
- C:\Users\JYJ\Documents\Codex\2026-05-15-company-homepage-multipage4\reservation.html

What this setup does:
- Customers can create posts from quote/reservation pages.
- Secret posts require the post password for customers.
- Admins can log in from admin-board.html and open all posts without the post password.
- Admins can save replies and delete posts.
- Inquiry form submissions are saved to `inquiry_submissions`.
- Inquiry attachments are uploaded to Supabase Storage.
- Inquiry submissions can trigger an email notification through Resend, with the file attached when size permits and with a signed download link included.
