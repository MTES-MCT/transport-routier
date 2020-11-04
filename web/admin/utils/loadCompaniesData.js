import { ADMIN_COMPANIES_QUERY } from "common/utils/api";
import { DAY } from "common/utils/time";

export async function loadCompaniesData(api, userId) {
  const companyResponse = await api.graphQlQuery(ADMIN_COMPANIES_QUERY, {
    id: userId,
    activityAfter: new Date(Date.now() - DAY * 1000 * 120)
      .toISOString()
      .slice(0, 10),
    workDaysLimit: 250
  });
  return companyResponse.data.user.adminedCompanies;
}