import React, { useState } from 'react';
import './SharePropertyPanel.css';
import {
  buildShareUrl,
  NotAuthenticatedError,
  ShareEmailFailedError,
  sharePropertyByEmail,
  ShareValidationError,
} from '../services/propertyShareService';

interface SharePropertyPanelProps {
  propertyId: string;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

/**
 * REQ-018: share via email (real delivery through the backend), share via text (opens
 * the visitor's own messaging app with the link pre-filled -- no SMS provider account
 * exists in this repo, see PROGRESS.md STORY-011), and a plain copyable link -- all
 * three point at the same canonical shareUrl.
 */
export function SharePropertyPanel({ propertyId }: SharePropertyPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const shareUrl = buildShareUrl(propertyId);

  async function handleCopyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('copied');
    } catch {
      // Failure path: link sharing must not crash even where the Clipboard API is
      // unavailable or denied -- the raw link is still shown below for manual copying.
      setCopyStatus('failed');
    }
  }

  async function handleSendEmail(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      await sharePropertyByEmail(propertyId, recipientEmail);
      setEmailSuccess(`Sent to ${recipientEmail}.`);
      setRecipientEmail('');
    } catch (err) {
      setEmailError(
        err instanceof ShareValidationError || err instanceof ShareEmailFailedError || err instanceof NotAuthenticatedError
          ? err.message
          : 'Something went wrong sharing this property.',
      );
    } finally {
      setIsSendingEmail(false);
    }
  }

  if (!isOpen) {
    return (
      <button type="button" className="share-property-panel__open" onClick={() => setIsOpen(true)}>
        Share
      </button>
    );
  }

  return (
    <section className="share-property-panel" aria-label="Share this property">
      <button type="button" className="share-property-panel__close" onClick={() => setIsOpen(false)}>
        Close
      </button>

      <div className="share-property-panel__link-row">
        <input
          type="text"
          readOnly
          value={shareUrl}
          aria-label="Shareable link"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" onClick={handleCopyLink}>
          Copy link
        </button>
      </div>
      {copyStatus === 'copied' && <p role="status">Link copied.</p>}
      {copyStatus === 'failed' && <p role="alert">Could not copy automatically — copy the link above manually.</p>}

      {/* Given a property, when shared via text, then a link should be sent -- the
          visitor's own device sends it, since no SMS provider is configured here. */}
      <a
        className="share-property-panel__text-link"
        href={`sms:?&body=${encodeURIComponent(`Check out this property on Keysy: ${shareUrl}`)}`}
      >
        Share via text
      </a>

      <form onSubmit={handleSendEmail} className="share-property-panel__email-form">
        <label htmlFor="shareRecipientEmail">Share via email</label>
        <div className="share-property-panel__email-input-row">
          <input
            id="shareRecipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={isSendingEmail}>
            {isSendingEmail ? 'Sending…' : 'Send'}
          </button>
        </div>
        {emailError && (
          <p role="alert" className="share-property-panel__email-error">
            {emailError}
          </p>
        )}
        {emailSuccess && <p className="share-property-panel__email-success">{emailSuccess}</p>}
      </form>
    </section>
  );
}
