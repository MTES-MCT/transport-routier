import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress/CircularProgress";
import Backdrop from "@material-ui/core/Backdrop/Backdrop";
import { NonConcurrentExecutionQueue } from "./concurrency";
import Portal from "@material-ui/core/Portal";

const LoadingScreenContext = React.createContext(() => () => {});

export function LoadingScreenContextProvider({ children }) {
  const loadingFunctionsQueue = React.useState(
    new NonConcurrentExecutionQueue()
  )[0];

  const [
    syncingWithBackendCounter,
    setSyncingWithBackendCounter
  ] = React.useState(0); // We use a counter instead of a boolean because multiple syncs can run simultaneously

  const withLoadingScreen = async (sync, id = null, nonBlocking = false) => {
    setSyncingWithBackendCounter(currentCounter => currentCounter + 1);
    try {
      if (nonBlocking) await sync();
      else {
        await loadingFunctionsQueue.execute(sync, id);
      }
      setSyncingWithBackendCounter(currentCounter => currentCounter - 1);
    } catch (err) {
      setSyncingWithBackendCounter(currentCounter => currentCounter - 1);
      console.log(err);
    }
  };

  return (
    <LoadingScreenContext.Provider value={withLoadingScreen}>
      {children}
      <Portal>
        <Backdrop
          open={syncingWithBackendCounter > 0}
          style={{
            position: "fixed",
            zIndex: 9999,
            backdropFilter: "blur(5px)"
          }}
        >
          <CircularProgress color="primary" />
        </Backdrop>
      </Portal>
    </LoadingScreenContext.Provider>
  );
}

export const useLoadingScreen = () => React.useContext(LoadingScreenContext);
