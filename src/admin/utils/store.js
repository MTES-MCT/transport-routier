import React from "react";
import { useStoreSyncedWithLocalStorage } from "../../common/utils/store";

const AdminStoreContext = React.createContext(() => {});

export function AdminStoreProvider({ children }) {
  const storeSyncedWithLocalStorage = useStoreSyncedWithLocalStorage();

  const [users, setUsers] = React.useState([]);
  const [workDays, setWorkDays] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);

  const sync = companyPayload => {
    setUsers(companyPayload.users || []);
    setWorkDays(companyPayload.workDays || []);
    setVehicles(companyPayload.vehicles || []);
  };

  return (
    <AdminStoreContext.Provider
      value={{
        companyId: storeSyncedWithLocalStorage.companyId(),
        users,
        setUsers,
        workDays,
        setWorkDays,
        vehicles,
        setVehicles,
        sync
      }}
    >
      {children}
    </AdminStoreContext.Provider>
  );
}

export const useAdminStore = () => React.useContext(AdminStoreContext);
