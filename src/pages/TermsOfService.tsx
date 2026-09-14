import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-mh-slate-400 hover:text-mh-gold-400 transition-colors mb-8">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50 p-6 md:p-10 shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-mh-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Terms of Service</h1>
            <p className="text-sm text-mh-slate-400 mt-1">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none text-mh-slate-300">
          <p>
            By accessing and using the Monster Hunter Field Guide ("the Site"), you agree to comply with and be bound by the following Terms of Service. If you do not agree to these terms, please do not use the Site.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Use of the Site</h2>
          <p>
            The Monster Hunter Field Guide is a community-driven tool created for players of the game Monster Hunter Outlanders. You agree to use this Site only for its intended purpose: tracking your in-game goals, theorycrafting builds, and respectfully engaging with the community.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. User-Generated Content</h2>
          <p>
            You are solely responsible for any content you post, including builds, comments, and profile information. By posting content on the Site, you grant us the right to display, modify, and distribute that content within the context of the Site.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-4 mb-6">
            <li>You may not post content that is illegal, offensive, abusive, or explicitly inappropriate.</li>
            <li>We reserve the right to remove any content or terminate accounts that violate these guidelines at our sole discretion.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Intellectual Property Rights</h2>
          <p>
            <strong>Disclaimer:</strong> The Monster Hunter Field Guide is an unofficial, community-made project. 
            "Monster Hunter", "Monster Hunter Outlanders", and all associated assets, logos, and names are the intellectual property of 
            Capcom Co., Ltd. and Niantic, Inc. 
          </p>
          <p className="mt-2">
            This Site is not affiliated with, endorsed by, or sponsored by Capcom or Niantic. Any game assets used on this site are used under fair use for educational and community tracking purposes.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Limitation of Liability</h2>
          <p>
            The Site is provided on an "as is" and "as available" basis without any warranties. We do not guarantee that the Site will always be secure, error-free, or function without disruptions. We will not be held liable for any data loss (including saved builds or challenge progress) or damages arising from your use of the Site.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Changes to the Terms</h2>
          <p>
            We may update these Terms of Service from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Your continued use of the Site after any such changes constitutes your acceptance of the new Terms of Service.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact the site administrator through our primary community channels.
          </p>
        </div>
      </div>
    </div>
  );
}
