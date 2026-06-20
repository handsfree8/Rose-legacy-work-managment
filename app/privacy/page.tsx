export const metadata = {
  title: "Privacy Policy - Rose Legacy",
}

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6 }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: June 2026</p>

      <p>
        Rose Legacy Home Solutions LLC ("Rose Legacy", "we", "us") operates the Rose Legacy mobile
        app and web portal (the "Services") used by our team and landlord clients to manage
        properties, maintenance tickets, photos, and invoices.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address and password, used to sign in to the app.</li>
        <li><strong>Property and ticket data:</strong> property addresses, maintenance ticket details, status, and notes you create.</li>
        <li><strong>Photos:</strong> before/after job photos uploaded by technicians to document work performed.</li>
        <li><strong>Invoice data:</strong> client name, line items, amounts, and payment status for invoices you create.</li>
      </ul>

      <h2>How We Use Information</h2>
      <p>
        Information is used solely to operate the Services: managing properties, tracking
        maintenance tickets, documenting work with photos, and generating invoices. We do not
        sell or share your information with third parties for marketing purposes.
      </p>

      <h2>Data Storage</h2>
      <p>
        Data is stored securely using Supabase (hosted on AWS infrastructure). Access is
        restricted to authenticated Rose Legacy team members.
      </p>

      <h2>Camera and Photo Library Access</h2>
      <p>
        The mobile app requests access to your camera and photo library so technicians can
        attach before/after photos to maintenance tickets. Photos are only uploaded when you
        choose to add them to a ticket.
      </p>

      <h2>Data Retention &amp; Deletion</h2>
      <p>
        Data is retained as long as needed for business records. To request deletion of your
        account or data, contact us using the information below.
      </p>

      <h2>Contact Us</h2>
      <p>
        Rose Legacy Home Solutions LLC<br />
        Overland Park, KS<br />
        Phone: 816 298 4828<br />
        Email: roselegacyhs@icloud.com
      </p>
    </main>
  )
}
