import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-mh-slate-400 hover:text-mh-gold-400 transition-colors mb-8">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50 p-6 md:p-10 shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-mh-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="text-sm text-mh-slate-400 mt-1">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none text-mh-slate-300">
          <p>
            Welcome to the Monster Hunter Field Guide ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy.
            This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Information We Collect</h2>
          <p>
            When you use our site, especially when you log in via Google OAuth or create an account, we may collect the following information:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-4 mb-6">
            <li><strong>Account Information:</strong> Your email address, display name, and profile picture (retrieved via Google Login).</li>
            <li><strong>User-Generated Content:</strong> Your saved builds, tracked challenges, comments, and public profile data.</li>
            <li><strong>Technical Data:</strong> Basic technical information (such as browser type and IP address) used automatically by our hosting and database providers to maintain security and functionality.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect primarily to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-4 mb-6">
            <li>Provide, operate, and maintain the site (e.g., keeping track of your specific Hunter's Challenges).</li>
            <li>Authenticate your login sessions securely.</li>
            <li>Display your public builds and profile to the community.</li>
            <li>Improve, personalize, and expand our website.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Third-Party Services</h2>
          <p>
            We use third-party services to run the Field Guide securely and efficiently. These include:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-4 mb-6">
            <li><strong>Supabase:</strong> We use Supabase as our database and authentication provider. Your data is stored securely in their infrastructure.</li>
            <li><strong>Google OAuth:</strong> If you sign in via Google, we use their service to authenticate your identity without storing your passwords.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies (like local storage) exclusively to manage your authentication session (keeping you logged in) and to store basic local preferences (like your sidebar state or theme). We do not use third-party advertising or marketing trackers.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Data Retention and Deletion</h2>
          <p>
            We keep your information for as long as your account is active. If you wish to delete your account and all associated data (builds, challenges, profile info), please contact us, and we will remove your data from our database.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please reach out to the site administrator through our community channels.
          </p>
        </div>
      </div>
    </div>
  );
}
