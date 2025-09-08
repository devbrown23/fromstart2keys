// api/nwmls.js
export default async function handler(req, res) {
  try {
    // Static demo listings (replace with RESO API call later)
    const listings = [
      {
        id: "tacoma-1",
        title: "Tacoma – 4bd/2.5ba",
        price: 624900,
        city: "Tacoma",
        beds: 4,
        baths: 2.5,
        sqft: 2210,
        address: "1234 N Pearl St, Tacoma, WA",
        img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop",
        badge: "Open House Sat",
        mlsId: "1234567",
        brokerage: "Unique Lifestyle Realty",
        disclaimer: "Information deemed reliable but not guaranteed. © NWMLS.",
        lastUpdated: new Date().toISOString(),
        portalUrl: process.env.VITE_PORTAL_URL || "#",
      },
      {
        id: "lacey-1",
        title: "Lacey – 3bd/2ba",
        price: 459000,
        city: "Lacey",
        beds: 3,
        baths: 2,
        sqft: 1650,
        address: "5678 Woodland Loop, Lacey, WA",
        img: "https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1400&auto=format&fit=crop",
        badge: "New",
        mlsId: "2345678",
        brokerage: "Unique Lifestyle Realty",
        disclaimer: "Information deemed reliable but not guaranteed. © NWMLS.",
        lastUpdated: new Date().toISOString(),
        portalUrl: process.env.VITE_PORTAL_URL || "#",
      },
      {
        id: "dupont-1",
        title: "DuPont – 5bd/3ba",
        price: 739500,
        city: "DuPont",
        beds: 5,
        baths: 3,
        sqft: 3010,
        address: "9012 Station Dr, DuPont, WA",
        img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1400&auto=format&fit=crop",
        badge: "Price Drop",
        mlsId: "3456789",
        brokerage: "Unique Lifestyle Realty",
        disclaimer: "Information deemed reliable but not guaranteed. © NWMLS.",
        lastUpdated: new Date().toISOString(),
        portalUrl: process.env.VITE_PORTAL_URL || "#",
      },
    ];

    res.status(200).json({ listings });
  } catch (err) {
    console.error("NWMLS API error:", err);
    res.status(500).json({ error: "Failed to load listings" });
  }
}
