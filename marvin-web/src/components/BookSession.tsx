import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { booking, social } from "../data/portfolio";
import { bookEvent } from "../lib/sections";

const rupiah = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
// The page opens with the form already showing when its address ends in ?book
// (a link or QR code that goes straight to booking).
const askedForBooking = () => new URLSearchParams(location.search).has("book");
function setBookingAddress(open: boolean) {
  const address = location.pathname + (open ? "?book" : "") + location.hash;
  if (address !== location.pathname + location.search + location.hash) history.replaceState(history.state, "", address);
}

// "Book a session": choose the strips and the add-on, give your name, and the order
// goes to Marvin on WhatsApp. Staff reply with the QRIS to pay and then the code.
export function BookSession() {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [strips, setStrips] = useState(1);
  const [allPhotos, setAllPhotos] = useState(false);
  const [name, setName] = useState("");
  const [here, setHere] = useState(false);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const root = document.documentElement;
    const open = () => {
      if (element.open) return;
      element.showModal();
      // Start at the title (not on the close button), so nothing looks pressed.
      title.current?.focus({ preventScroll: true });
      root.dataset.booking = "open";
      setBookingAddress(true);
    };
    const onClose = () => {
      delete root.dataset.booking;
      setBookingAddress(false);
    };
    addEventListener(bookEvent, open);
    element.addEventListener("close", onClose);
    if (askedForBooking()) open();
    return () => {
      removeEventListener(bookEvent, open);
      element.removeEventListener("close", onClose);
      delete root.dataset.booking;
    };
  }, []);

  const extras = strips - 1;
  const extraPrice = booking.extraStrip;
  const total = booking.firstStrip + (extraPrice ?? 0) * extras + (allPhotos ? booking.allPhotos : 0);
  const extrasPending = extras > 0 && extraPrice === null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const lines = [
      `Halo Marvin, saya mau book a session di booth ${booking.place}.`,
      "",
      `Nama: ${name.trim()}`,
      `Jumlah strip: ${strips}`,
      `All your photos (+${rupiah(booking.allPhotos)}): ${allPhotos ? "ya" : "tidak"}`,
      `Total: ${rupiah(total)}${extrasPending ? ` + ${extras} strip tambahan` : ""}`,
      ...(here ? ["", "Saya sudah di booth sekarang."] : []),
      "",
      "Mohon kirim QRIS untuk pembayarannya. Terima kasih!",
    ];
    const link = `https://wa.me/${social.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <dialog className="booking" ref={dialog} aria-labelledby={`${id}-title`}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="booking-page">
        <div className="booking-ticker" aria-hidden="true">
          <div className="booking-ticker-run">
            {[0, 1].map(copy => (
              <span key={copy}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index}>Book any day<i /> One code, one session<i /> Pay by QRIS<i /></span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="booking-close" aria-label="Close booking" onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <div className="booking-grid">
          <header className="booking-intro">
            <p className="booking-place">Marvin Studio · {booking.place}</p>
            <h2 id={`${id}-title`} className="booking-title" tabIndex={-1} ref={title}>Book a session.<span>Use it any day.</span></h2>
            <p className="booking-lead">Send your order, pay by QRIS, get a code. Type it at the booth. One code, one session, no expiry.</p>
            <a className="booking-map" href={booking.maps} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
              <span>{booking.address}</span>
            </a>
          </header>

          <form className="booking-form" onSubmit={submit}>
            <fieldset className="booking-step">
              <legend><span className="booking-num">01</span>Strips</legend>
              <div className="strip-picker">
                {Array.from({ length: booking.maxStrips }, (_, index) => index + 1).map(count => (
                  <label key={count} className="strip-option">
                    <input type="radio" name="strips" value={count} checked={strips === count}
                      onChange={() => setStrips(count)} aria-label={`${count} strip${count > 1 ? "s" : ""}`} />
                    <span aria-hidden="true">{count}</span>
                  </label>
                ))}
              </div>
              <p className="booking-hint">First strip {rupiah(booking.firstStrip)}{extraPrice !== null && ` · each extra ${rupiah(extraPrice)}`}</p>
            </fieldset>

            <fieldset className="booking-step">
              <legend><span className="booking-num">02</span>Add-on</legend>
              <label className="booking-addon">
                <input type="checkbox" checked={allPhotos} onChange={event => setAllPhotos(event.target.checked)} />
                <span className="booking-addon-box" aria-hidden="true" />
                <span className="booking-addon-text">
                  <strong>All your photos <em>+{rupiah(booking.allPhotos)}</em></strong>
                  <small>Every shot on your phone, not only the strip's. Digital only.</small>
                </span>
              </label>
            </fieldset>

            <fieldset className="booking-step">
              <legend><span className="booking-num">03</span>Your details</legend>
              <label className="booking-field">
                <span>Your name</span>
                <input type="text" name="name" required autoComplete="name" maxLength={60} value={name}
                  onChange={event => setName(event.target.value)} aria-describedby={`${id}-name`} />
                <small id={`${id}-name`}>The booth welcomes you by it</small>
              </label>
              <label className="booking-switch">
                <input type="checkbox" role="switch" checked={here} onChange={event => setHere(event.target.checked)} />
                <span className="booking-switch-track" aria-hidden="true" />
                <span className="booking-switch-text">
                  <strong>I'm at the booth now</strong>
                  <small>{here ? "We put you in the line as soon as you have paid." : "Not there yet? Leave this off and show your code when you arrive."}</small>
                </span>
              </label>
            </fieldset>

            <div className="booking-summary" aria-live="polite">
              <dl>
                <div><dt>First strip</dt><dd>{rupiah(booking.firstStrip)}</dd></div>
                <div><dt>Extra strips × {extras}</dt><dd>{extrasPending ? "On WhatsApp" : rupiah((extraPrice ?? 0) * extras)}</dd></div>
                {allPhotos && <div><dt>All your photos</dt><dd>+{rupiah(booking.allPhotos)}</dd></div>}
                <div className="booking-total">
                  <dt>Total</dt>
                  <dd>{rupiah(total)}{extrasPending && <small>+ {extras} extra strip{extras > 1 ? "s" : ""}, price on WhatsApp</small>}</dd>
                </div>
              </dl>
              <button type="submit" className="booking-submit">
                <span>Book and pay</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
              </button>
              <p className="booking-pay">WhatsApp opens with your order. We reply with a QRIS: pay with GoPay or any bank or e-wallet app, then get your code.</p>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
