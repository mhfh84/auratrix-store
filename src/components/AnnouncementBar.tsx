'use client';

import React, { useState } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { getLocalizedText } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function AnnouncementBar() {
  const { serverSettings, language } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  if (!serverSettings?.announcementEnabled || !serverSettings?.announcementText || dismissed) {
    return null;
  }

  const displayText = getLocalizedText(serverSettings.announcementText, language);
  if (!displayText) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white text-xs font-semibold py-2 px-4 shadow-sm relative z-50 flex items-center justify-between">
      <div className="flex-1 flex items-center justify-center gap-2 text-center px-4">
        <FontAwesomeIcon icon={faBullhorn} className="text-amber-300 text-sm animate-bounce hidden sm:inline-block" />
        <span className="truncate max-w-4xl">{displayText}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-white/80 hover:text-white transition p-1 rounded-md focus:outline-none"
        title="Dismiss announcement"
      >
        <FontAwesomeIcon icon={faTimes} className="text-xs" />
      </button>
    </div>
  );
}
