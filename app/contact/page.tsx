import type { Metadata } from "next";
import "@/styles/contact.css";
import ContactDetails from "@/components/ContactDetails";
import { fetchSiteSettings } from "@/lib/mongo";
import { DEFAULT_CONTACT } from "@/lib/siteDefaults";

export const metadata: Metadata = {
  title: "Contact | Elnahass For Construction and Technology",
};

export const dynamic = "force-dynamic";

async function loadContactCopy() {
  try {
    const settings = await fetchSiteSettings();
    const contact = settings?.contact;
    return {
      pageTitle: contact?.pageTitle ?? DEFAULT_CONTACT.pageTitle,
      sectionTitle: contact?.sectionTitle ?? DEFAULT_CONTACT.sectionTitle,
      findUsTitle: contact?.findUsTitle ?? DEFAULT_CONTACT.findUsTitle,
      address: contact?.address ?? DEFAULT_CONTACT.address,
      tel: contact?.tel ?? DEFAULT_CONTACT.tel,
      fax: contact?.fax ?? DEFAULT_CONTACT.fax,
      email: contact?.email ?? DEFAULT_CONTACT.email,
      mapEmbedUrl: contact?.mapEmbedUrl ?? DEFAULT_CONTACT.mapEmbedUrl,
    };
  } catch {
    return { ...DEFAULT_CONTACT };
  }
}

export default async function ContactPage() {
  const copy = await loadContactCopy();

  return (
    <section>
      <div className="flex-column d-flex justify-content-center align-items-center">
        <img
          draggable={false}
          className="contact-img"
          src="/Media/contact_cover.webp"
          alt=""
        />
        <div className="container contact-us-container">
          <h3 className="contact-us-title">{copy.pageTitle}</h3>
        </div>
      </div>
      <ContactDetails
        sectionTitle={copy.sectionTitle}
        findUsTitle={copy.findUsTitle}
        address={copy.address}
        tel={copy.tel}
        fax={copy.fax}
        email={copy.email}
        mapEmbedUrl={copy.mapEmbedUrl}
      />
    </section>
  );
}
