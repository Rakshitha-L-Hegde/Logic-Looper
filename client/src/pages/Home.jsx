
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useEffect, useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleStartGame = async () => {
    // If already logged in → go directly
    if (user) {
      navigate("/game");
      return;
    }

    // If not logged in → trigger Google login
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      navigate("/game"); // go after login
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #7752FE 0%, #190482 100%)",
      }}
    >
      <div className="text-center">

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

        <p
          style={{
            fontSize: "24px",
            color: "#DDF2FD",
            marginBottom: "60px",
          }}
        >
          Are you ready for Today's Challenge?
        </p>

        <button
          onClick={handleStartGame}
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
        >
          <Play size={30} fill="#FFFFFF" />
          {user ? "Continue Game" : "Start Game"}
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
