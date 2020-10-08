import { GET_EMPLOYMENT_QUERY } from "common/utils/api";
import { formatApiError } from "common/utils/errors";

export async function loadEmployeeInvite(token, store, api, setError) {
  try {
    const employment = await api.graphQlQuery(
      GET_EMPLOYMENT_QUERY,
      {
        token
      },
      { context: { nonPublicApi: true } }
    );
    store.setEmployeeInvite({
      ...employment.data.employment,
      inviteToken: token
    });
  } catch (err) {
    setError(formatApiError(err));
  }
}
