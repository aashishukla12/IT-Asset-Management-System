import "../styles.css";
import "./next.css";

export const metadata = {
  title: "AssetFlow — IT Asset Management",
  description: "Local IT asset inventory management"
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
