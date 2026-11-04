import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { toast } from "react-toastify";
import { Page, PageHeader } from "@/custom-components/Page";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateTo = useNavigate();
  const handleContactForm = (e) => {
    e.preventDefault();
    setLoading(true);

    const templateParams = {
      name,
      email,
      phone,
      subject,
      message,
    };

    emailjs
      .send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_v01mtcu",
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_3a1r5xp",
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YcOimjllS64zn4ghK"
      )
      .then(() => {
        toast.success("Thank You! Your message has been sent successfully.");
        setLoading(false);
        navigateTo("/");
      })
      .catch((err) => {
        toast.error("Failed to send message.");
        setLoading(false);
      });
  };

  const field = "input";
  return (
    <Page narrow>
      <PageHeader title="Contact us" subtitle="Questions about an auction, payment or your account? Send us a note." />
      <form onSubmit={handleContactForm} className="panel panel-pad space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-name" className="label">Your name</label>
            <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="c-email" className="label">Your email</label>
            <input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="c-phone" className="label">Your phone</label>
            <input id="c-phone" inputMode="numeric" required value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="c-subject" className="label">Subject</label>
            <input id="c-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="c-message" className="label">Message</label>
          <textarea id="c-message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={field} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary btn-lg">{loading ? "Sending…" : "Send message"}</button>
      </form>
    </Page>
  );
};

export default Contact;
