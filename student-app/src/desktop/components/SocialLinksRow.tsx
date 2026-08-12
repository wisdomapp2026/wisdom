import type { SocialLink } from "@shared/types";

/**
 * Desktop ijtimoiy tarmoq havolalari — mobil versiyadagi kichik doiralar
 * o'rniga kattaroq, nom bilan ko'rsatiladigan kartochkalar.
 */
export default function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;

  return (
    <section
      className="rounded-[28px] px-10 py-10 text-center"
      style={{
        background: "linear-gradient(180deg, rgba(148,163,184,0.07) 0%, transparent 100%)",
        border: "1px solid var(--dk-border)",
      }}
    >
      <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Biz bilan bog'laning</h3>
      <p className="text-[13.5px] text-gray-500 mt-1.5">
        Yangiliklar va foydali materiallardan xabardor bo'lib turing
      </p>

      <div className="flex flex-wrap justify-center gap-4 mt-7">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className="dk-press group flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            style={{ border: "1px solid var(--dk-border)" }}
          >
            <SocialIcon platform={link.platform} iconUrl={link.iconUrl} />
            <span className="text-[13.5px] font-semibold text-gray-700 group-hover:text-primary-600 transition-colors">
              {link.label || platformLabel(link.platform)}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    telegram: "Telegram",
    instagram: "Instagram",
    youtube: "YouTube",
    facebook: "Facebook",
    tiktok: "TikTok",
    twitter: "X",
    linkedin: "LinkedIn",
    website: "Veb-sayt",
  };
  return map[platform] || "Havola";
}

function SocialIcon({ platform, iconUrl }: { platform: string; iconUrl?: string }) {
  if (iconUrl) {
    return (
      <span className="w-10 h-10 rounded-xl overflow-hidden shrink-0 block">
        <img src={iconUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      </span>
    );
  }

  const icons: Record<string, { bg: string; content: React.ReactNode }> = {
    telegram: {
      bg: "bg-[#0088cc]",
      content: (
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      ),
    },
    instagram: {
      bg: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]",
      content: (
        <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.23 1 .5 1.4.94.44.44.71.84.94 1.4.17.4.36 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.23.6-.5 1-.94 1.4-.44.44-.84.71-1.4.94-.4.17-1 .36-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.23-1-.5-1.4-.94a3.9 3.9 0 0 1-.94-1.4c-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.23-.6.5-1 .94-1.4.44-.44.84-.71 1.4-.94.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2zm0 3.3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 2.3a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm6.8-2.6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
      ),
    },
    youtube: {
      bg: "bg-[#FF0000]",
      content: (
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      ),
    },
    facebook: {
      bg: "bg-[#1877F2]",
      content: (
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      ),
    },
    tiktok: {
      bg: "bg-black",
      content: (
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      ),
    },
    twitter: {
      bg: "bg-black",
      content: (
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      ),
    },
    linkedin: {
      bg: "bg-[#0A66C2]",
      content: (
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.06 2.06 0 1 1 0-4.128 2.06 2.06 0 0 1 0 4.128zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      ),
    },
    website: {
      bg: "bg-gray-500",
      content: (
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ),
    },
  };

  const data = icons[platform] || icons.website;
  return (
    <span className={`w-10 h-10 ${data.bg} rounded-xl grid place-items-center shrink-0 shadow-sm`}>
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {data.content}
      </svg>
    </span>
  );
}
