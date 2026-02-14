import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #7752FE 0%, #190482 100%)",
      }}
    >
      <div className="text-center">
        {/* TITLE */}
        <h1
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "#FFFFFF",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            marginBottom: "40px",
          }}
        >
          Daily Quest
        </h1>

        {/* SUBTITLE */}
        <p
          style={{
            fontSize: "24px",
            color: "#DDF2FD",
            marginBottom: "60px",
          }}
        >
          Are you ready for Today's Challenge?
        </p>

        {/* BUTTON */}
        <button
          onClick={() => navigate("/game")}
          style={{
            backgroundColor: "#F05537",
            color: "#FFFFFF",
            fontSize: "20px",
            fontWeight: 600,
            padding: "20px 60px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            margin: "0 auto",
            boxShadow:
              "0 15px 40px rgba(240, 85, 55, 0.4)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform =
              "translateY(-3px)";
            e.currentTarget.style.boxShadow =
              "0 20px 50px rgba(240, 85, 55, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform =
              "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 15px 40px rgba(240, 85, 55, 0.4)";
          }}
        >
          <Play size={30} fill="#FFFFFF" />
          Start Game
        </button>

        {/* DOTS */}
        <div
          style={{
            marginTop: "80px",
            display: "flex",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#525CEB",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#DDF2FD",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#F05537",
            }}
          />
        </div>
      </div>
    </div>
  );
}
