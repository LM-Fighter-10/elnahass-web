"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";

type ContactDetailsProps = {
  sectionTitle: string;
  findUsTitle: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  mapEmbedUrl: string;
};

export default function ContactDetails({
  sectionTitle,
  findUsTitle,
  address,
  tel,
  fax,
  email,
  mapEmbedUrl,
}: ContactDetailsProps) {
  useScrollReveal(".contact-title, #googleMap, .contact-row");

  return (
    <section className="contact-section">
      <div className="contact-section-div">
        <h2 className="contact-title">{sectionTitle}</h2>
        <div className="container container-edited">
          <div className="row contact-row">
            <div className="col-sm-7">
              <iframe
                id="googleMap"
                src={mapEmbedUrl}
                width={600}
                height={450}
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Map"
              />
            </div>
            <div className="col-sm-5 sec2">
              <h2 className="findUs">{findUsTitle}</h2>
              <p className="contact-body">
                <b>Location:</b>{" "}
                <span className="details">{address}</span>
                <br />
                <b>Tel:</b> <span className="details">{tel}</span>
                <br />
                <b>Fax:</b> <span className="details">{fax}</span>
                <br />
                <b>Email:</b> <span className="details">{email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
