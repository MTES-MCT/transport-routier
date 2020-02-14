import { USER_QUERY } from "./api";

export async function loadUserData(api, storeSyncedWithLocalStorage) {
  try {
    const userResponse = await api.graphQlQuery(USER_QUERY, {
      id: storeSyncedWithLocalStorage.userId()
    });
    const {
      firstName,
      lastName,
      company,
      activities,
      expenditures
    } = userResponse.data.user;
    storeSyncedWithLocalStorage.setName({ firstName, lastName });
    storeSyncedWithLocalStorage.setCoworkers(
      company.users.concat(
        storeSyncedWithLocalStorage.coworkersPendingSubmission()
      )
    );
    storeSyncedWithLocalStorage.setActivities(
      activities.concat(
        storeSyncedWithLocalStorage.activitiesPendingSubmission()
      )
    );
    storeSyncedWithLocalStorage.setExpenditures(
      expenditures.concat(
        storeSyncedWithLocalStorage.expendituresPendingSubmission()
      )
    );
  } catch (err) {
    console.log(err);
  }
}