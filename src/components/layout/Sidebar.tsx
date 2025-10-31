"use client";
import { AnimatePresence, motion } from "motion/react";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, X, User, LogOut } from "lucide-react";
import Image from "next/image";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = useSession();

  return (
    
    <motion.div
      className={[
        "bg-secondary dark:bg-gray-800",
        "transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-20  justify-center items-center p-2" : "w-64",
        "overflow-hidden",
      ].join(" ")}
    >
      <div className={`h-full flex w-full  flex-col items-center `}>
        {/* Header */}
        <div className={`flex items-center justify-center  mb-8 ${isCollapsed?'flex-col':'flex-row p-5'}`}>
          <h2
            className={[
              "font-bold  font-sans text-4xl  text-black dark:text-white",
              isCollapsed ? "opacity-0 text-md select-none" : "opacity-100",
              "transition-opacity duration-800",
            ].join(" ")}
          >
            WZDM
          </h2>
          <Image src="/images/logo.png" width={isCollapsed?70:50} height={isCollapsed?70:50} alt=""></Image>

          {/* Single toggle that opens/closes */}
          <motion.button
           whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
            onClick={() => setIsCollapsed((v) => !v)}
            className="p-1 px-3 mt-5 hover:bg-primary dark:hover:bg-gray-700 rounded-lg text-black dark:text-gray-300 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu size={30} /> : <X size={20} />}
          </motion.button>
        </div>

        {/* Optional: explicit open button for clarity when collapsed */}
        

        {/* Auth block */}
        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center flex-col gap-10 min-w-0">
              <div className="flex flex-col items-center justify-between gap-2 min-w-0">
                {session.user?.image ? (
                  
                  <img
                    src={session.user.image}
                    alt={session.user?.name || "User"}
                    className="w-10 h-10 bg-accents rounded-full"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User
                      size={16}
                      className="text-gray-600 dark:text-gray-300"
                    />
                  </div>
                )}
                {!isCollapsed && (
                  <span className=" font-medium text-black dark:text-gray-200 truncate">
                    {session.user?.name}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <motion.button
                whileHover={{scale:1.1}}
                whileTap={{scale:0.95}}
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-6 py-2 bg-primary rounded-sm text-white dark:hover:text-white  dark:hover:bg-gray-700 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </motion.button>
              )}
            </div> 
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => signIn("google")}
              className={[
                "text-accents px-4 py-2 rounded-lg transition-color flex gap-3",
                isCollapsed
                  ? "w-15 h-10 p-0 flex items-center justify-center "
                  : "",
                "bg-primary",
              ].join(" ")}
              title="Login with Google"
              aria-label="Login with Google"
            >
              {isCollapsed ? (
                <Image
                  src="/images/google.png"
                  width={25}
                  height={25}
                  alt="google"
                />
              ) : (
                <>
                  <p>Login with Google </p>{" "}
                  <Image
                    src="/images/google.png"
                    width={25}
                    height={25}
                    alt="google"
                  />
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
    
  );
}
