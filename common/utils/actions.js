import React from "react";
import mapValues from "lodash/mapValues";
import map from "lodash/map";
import values from "lodash/values";
import * as Sentry from "@sentry/browser";
import find from "lodash/find";
import { isPendingSubmission, useStoreSyncedWithLocalStorage } from "./store";
import {
  CANCEL_ACTIVITY_MUTATION,
  CANCEL_COMMENT_MUTATION,
  CANCEL_EXPENDITURE_MUTATION,
  CREATE_MISSION_MUTATION,
  EDIT_ACTIVITY_MUTATION,
  END_MISSION_MUTATION,
  LOG_ACTIVITY_MUTATION,
  LOG_COMMENT_MUTATION,
  LOG_EXPENDITURE_MUTATION,
  LOG_LOCATION_MUTATION,
  useApi,
  VALIDATE_MISSION_MUTATION
} from "./api";
import { ACTIVITIES, parseActivityPayloadFromBackend } from "./activities";
import { parseMissionPayloadFromBackend } from "./mission";
import { getTime } from "./events";
import {
  formatNameInGqlError,
  graphQLErrorMatchesCode,
  isGraphQLError
} from "./errors";
import { formatDay, formatTimeOfDay, now, truncateMinute } from "./time";
import { formatPersonName } from "./coworkers";
import { EXPENDITURES } from "./expenditures";
import { useSnackbarAlerts } from "../../web/common/Snackbar";
import { useModals } from "./modals";

const ActionsContext = React.createContext(() => {});

class Actions {
  constructor(store, api, modals, alerts) {
    this.store = store;
    this.api = api;
    this.modals = modals;
    this.alerts = alerts;

    api.registerResponseHandler("logActivity", {
      onSuccess: (
        apiResponse,
        { activityId: tempActivityId, requestId, switchMode, endTime }
      ) => {
        const activity = parseActivityPayloadFromBackend(
          apiResponse.data.activities.logActivity
        );
        const activities = [activity];
        let syncScope = a => false;
        if (switchMode) {
          const previousActivity = values(
            this.store.getEntity("activities")
          ).find(
            a =>
              a.userId === activity.userId &&
              a.id !== tempActivityId &&
              isPendingSubmission(a) &&
              a.pendingUpdates.some(
                upd => upd.type === "update" && upd.requestId === requestId
              )
          );
          if (previousActivity && previousActivity.id !== activity.id) {
            activities.push({
              ...previousActivity,
              endTime: activity.startTime
            });
            syncScope = a => a.id === previousActivity.id;
          }
        }
        this.store.addToIdentityMap(tempActivityId, activity.id);
        if (!endTime) {
          const mission = this.store.getEntity("missions")[
            activity.missionId.toString()
          ];
          if (mission && mission.id)
            this.store.syncEntity(
              [
                {
                  ...mission,
                  ended: false
                }
              ],
              "missions",
              m => m.id === activity.missionId
            );
          else
            Sentry.captureMessage(
              `Warning : No id found for mission ${mission}`
            );
        }
        this.store.syncEntity(activities, "activities", syncScope, {
          [activity.id]: tempActivityId
        });
      },
      onError: async (
        error,
        {
          actualUserId,
          requestId,
          activityId: tempActivityId,
          type,
          forceKillSisterActivitiesOnFail,
          groupId,
          startTime
        }
      ) => {
        // If the log-activity event raises an API error we cancel all the pending requests for the activity
        let requestsToCancel = this.store
          .pendingRequests()
          .filter(
            req =>
              (req.variables && req.variables.activityId === tempActivityId) ||
              (req.storeInfo && req.storeInfo.activityId === tempActivityId)
          );
        // If the activity should not be submitted for team mates because it failed for the main user, cancel the corresponding requests
        if (forceKillSisterActivitiesOnFail && groupId) {
          let otherRequestsToCancel = this.store
            .pendingRequests()
            .filter(
              req => req.groupId === groupId && req.requestId !== requestId
            );
          // We should also cancel further requests concerning these non submitted activities
          const activityIds = otherRequestsToCancel.map(
            req => req.storeInfo.activityId
          );
          otherRequestsToCancel = [
            ...otherRequestsToCancel,
            ...this.store
              .pendingRequests()
              .filter(
                req =>
                  req.variables &&
                  req.variables.activityId &&
                  activityIds.includes(req.variables.activityId)
              )
          ];
          requestsToCancel = [...requestsToCancel, ...otherRequestsToCancel];
        }

        if (isGraphQLError(error)) {
          const user =
            actualUserId === this.store.userId()
              ? this.store.userInfo()
              : this.store.getEntity("coworkers")[actualUserId.toString()];
          this.displayApiErrors({
            graphQLErrors: error.graphQLErrors,
            actionDescription: `L'activité ${
              ACTIVITIES[type].label
            } de ${formatPersonName(user)} à ${formatTimeOfDay(startTime)}`,
            isActionDescriptionFemale: true,
            overrideFormatGraphQLError: gqlError => {
              return this.formatLogActivityError(
                gqlError,
                user,
                this.store.userId()
              );
            },
            hasRequestFailed: true,
            shouldProposeRefresh:
              this.store.userId() === actualUserId &&
              this.shouldProposeRefresh(error)
          });
        }
        await Promise.all(
          requestsToCancel.map(req => this.store.clearPendingRequest(req))
        );
      }
    });

    api.registerResponseHandler("cancelOrEditActivity", {
      onSuccess: (apiResponse, { activityId, actionType, newEndTime }) => {
        if (actionType === "cancel") {
          if (apiResponse.data.activities.cancelActivity.success) {
            this.store.syncEntity([], "activities", a => a.id === activityId);
          }
        } else {
          const activity = parseActivityPayloadFromBackend(
            apiResponse.data.activities.editActivity
          );
          if (!newEndTime) {
            const mission = this.store.getEntity("missions")[
              activity.missionId.toString()
            ];
            if (mission && mission.id)
              this.store.syncEntity(
                [
                  {
                    ...mission,
                    ended: false
                  }
                ],
                "missions",
                m => m.id === activity.missionId
              );
            else
              Sentry.captureMessage(
                `Warning : No id found for mission ${mission}`
              );
          }
          this.store.syncEntity(
            [activity],
            "activities",
            a => a.id === activity.id
          );
        }
      },
      onError: (error, { userId, type }) => {
        const selfId = this.store.userId();
        const user =
          userId === selfId
            ? this.store.userInfo()
            : this.store.getEntity("coworkers")[userId.toString()];
        if (isGraphQLError(error)) {
          this.displayApiErrors({
            graphQLErrors: error.graphQLErrors,
            actionDescription: `La correction de l'activité ${
              ACTIVITIES[type].label
            } de ${formatPersonName(user)}`,
            overrideFormatGraphQLError: gqlError => {
              return this.formatLogActivityError(gqlError, user, selfId);
            },
            hasRequestFailed: true,
            shouldProposeRefresh:
              selfId === userId && this.shouldProposeRefresh(error),
            isActionDescriptionFemale: true
          });
        }
      }
    });

    api.registerResponseHandler("beginMission", {
      onSuccess: (apiResponse, { missionId: tempMissionId }) => {
        const mission = apiResponse.data.activities.createMission;
        this.store.addToIdentityMap(tempMissionId, mission.id);
        this.store.syncEntity(
          [
            parseMissionPayloadFromBackend(
              { ...mission, ended: false },
              this.store.userId()
            )
          ],
          "missions",
          () => false,
          { [mission.id]: tempMissionId }
        );
        this.store.setStoreState(
          prevState => ({
            activities: mapValues(prevState.activities, a => ({
              ...a,
              missionId:
                a.missionId === tempMissionId ? mission.id : a.missionId
            }))
          }),
          ["activities"]
        );
        this.store.setStoreState(
          prevState => ({
            expenditures: mapValues(prevState.expenditures, e => ({
              ...e,
              missionId:
                e.missionId === tempMissionId ? mission.id : e.missionId
            }))
          }),
          ["expenditures"]
        );
      },
      onError: async (error, { missionId: tempMissionId }) => {
        // If the begin-mission event raises an API error we cancel all the pending requests for the mission
        const pendingMissionRequests = this.store
          .pendingRequests()
          .filter(
            req =>
              (req.variables && req.variables.missionId === tempMissionId) ||
              (req.storeInfo && req.storeInfo.missionId === tempMissionId)
          );
        await Promise.all(
          pendingMissionRequests.map(req => this.store.clearPendingRequest(req))
        );
        this.store.syncEntity([], "missions", m => m.id === tempMissionId);
      }
    });

    api.registerResponseHandler("endMission", {
      onSuccess: apiResponse => {
        const mission = apiResponse.data.activities.endMission;
        this.store.syncEntity(
          [{ ...parseMissionPayloadFromBackend(mission), ended: true }],
          "missions",
          m => m.id === mission.id
        );
        this.store.syncEntity(
          mission.activities.map(parseActivityPayloadFromBackend),
          "activities",
          a => a.missionId === mission.id
        );
      },
      onError: (error, { userId, missionId, currentActivityId, name }) => {
        if (
          isGraphQLError(error) &&
          error.graphQLErrors.some(gqle =>
            graphQLErrorMatchesCode(gqle, "MISSION_ALREADY_ENDED")
          )
        ) {
          const missionEndTime = error.graphQLErrors.find(gqle =>
            graphQLErrorMatchesCode(gqle, "MISSION_ALREADY_ENDED")
          ).extensions.missionEnd.endTime;
          if (currentActivityId) {
            const currentActivity = this.store.getEntity("activities")[
              currentActivityId.toString()
            ];
            if (currentActivity)
              this.store.syncEntity(
                [
                  {
                    ...currentActivity,
                    endTime: missionEndTime
                  }
                ],
                "activities",
                a => a.id === currentActivityId
              );
            else
              Sentry.captureMessage(
                `Warning : Could not find activity with id ${currentActivityId}`
              );
          }
          if (userId === this.store.userId()) {
            this.store.syncEntity(
              [
                {
                  ...this.store.getEntity("missions")[missionId.toString()],
                  ended: true
                }
              ],
              "missions",
              m => m.id === missionId
            );
          }
        }
        if (isGraphQLError(error)) {
          this.displayApiErrors({
            graphQLErrors: error.graphQLErrors,
            actionDescription: `La fin de la mission ${name ? `${name} ` : ""}`,
            overrideFormatGraphQLError: gqlError => {
              const selfId = this.store.userId();
              const user =
                userId === selfId
                  ? this.store.userInfo()
                  : this.store.getEntity("coworkers")[userId.toString()];
              return this.formatLogActivityError(gqlError, user, selfId);
            },
            hasRequestFailed: true,
            shouldProposeRefresh:
              userId === this.store.userId() &&
              this.shouldProposeRefresh(error),
            isActionDescriptionFemale: true
          });
        }
      }
    });

    api.registerResponseHandler("validateMission", {
      onSuccess: async (apiResponse, { validation }) => {
        const mission = apiResponse.data.activities.validateMission.mission;
        await this.store.syncEntity(
          [
            {
              ...mission,
              ended: true,
              validation,
              adminValidation: apiResponse.data.activities.validateMission
                .isAdmin
                ? validation
                : null
            }
          ],
          "missions",
          m => m.id === mission.id
        );
        this.alerts.success(
          `La mission${
            mission.name ? " " + mission.name : ""
          } a été validée avec succès !`,
          mission.id,
          6000
        );
      }
    });

    api.registerResponseHandler("logExpenditure", {
      onSuccess: apiResponse => {
        const expenditure = apiResponse.data.activities.logExpenditure;
        this.store.syncEntity([expenditure], "expenditures", () => false);
      },
      onError: (error, { userId, type }) => {
        if (isGraphQLError(error)) {
          const user =
            userId === this.store.userId()
              ? this.store.userInfo()
              : this.store.getEntity("coworkers")[userId.toString()];
          this.displayApiErrors({
            graphQLErrors: error.graphQLErrors,
            overrideFormatGraphQLError: gqlError => {
              if (graphQLErrorMatchesCode(gqlError, "DUPLICATE_EXPENDITURES")) {
                return "Un frais de cette nature a déjà été enregistré sur la mission.";
              }
            },
            actionDescription: `Le ${
              EXPENDITURES[type].label
            } de ${formatPersonName(user)}`,
            hasRequestFailed: true,
            shouldReload: false
          });
        }
      }
    });

    api.registerResponseHandler("cancelExpenditure", {
      onSuccess: (apiResponse, { expenditureId }) => {
        this.store.syncEntity([], "expenditures", e => e.id === expenditureId);
      }
    });

    api.registerResponseHandler("logComment", {
      onSuccess: apiResponse => {
        const comment = apiResponse.data.activities.logComment;
        this.store.syncEntity([comment], "comments", () => false);
      }
    });

    api.registerResponseHandler("cancelComment", {
      onSuccess: (apiResponse, { commentId }) => {
        this.store.syncEntity([], "comments", e => e.id === commentId);
      }
    });

    api.registerResponseHandler("logLocation", {
      onSuccess: (apiResponse, { missionId, isStart }) => {
        const location = apiResponse.data.activities.logLocation;
        const mission = store.getEntity("missions")[missionId.toString()];
        this.store.syncEntity(
          [
            {
              ...mission,
              [isStart ? "startLocation" : "endLocation"]: location
            }
          ],
          "missions",
          m => m.id === missionId
        );
      }
    });
  }

  displayApiErrors = async ({
    graphQLErrors,
    actionDescription,
    overrideFormatGraphQLError = null,
    hasRequestFailed = true,
    shouldProposeRefresh = false,
    isActionDescriptionFemale = false,
    title = null,
    message = null
  }) => {
    this.modals.open("apiErrorDialog", {}, currentProps => {
      const newError = {
        actionDescription,
        graphQLErrors,
        overrideFormatGraphQLError,
        hasRequestFailed,
        shouldProposeRefresh,
        isActionDescriptionFemale,
        title,
        message
      };
      const updatedErrors = currentProps.errors
        ? [...currentProps.errors, newError]
        : [newError];

      return {
        ...currentProps,
        shouldProposeRefresh:
          shouldProposeRefresh || currentProps.shouldProposeRefresh,
        errors: updatedErrors
      };
    });
  };

  submitAction = (
    query,
    variables,
    optimisticStoreUpdate,
    watchFields,
    responseHandlerName,
    batchable = true,
    groupId = null
  ) => {
    // 1. Store the request and optimistically update the store as if the api responded successfully
    const time = Date.now();
    const request = this.store.newRequest(
      query,
      variables,
      optimisticStoreUpdate,
      watchFields,
      responseHandlerName,
      batchable,
      groupId
    );

    // 2. Execute the request (call API) along with any other pending one
    // await api.nonConcurrentQueryQueue.execute(() => api.executeRequest(request));
    this.api.executePendingRequests();
    return this.api.recentRequestStatuses.get(request.id, time);
  };

  graphQLErrorImpliesNotUpToDateData = gqlError => {
    if (graphQLErrorMatchesCode(gqlError, "OVERLAPPING_MISSIONS")) {
      return (
        gqlError.extensions.conflictingMission &&
        gqlError.extensions.conflictingMission.submitter.id !==
          this.store.userId() &&
        !this.store.getEntity("missions")[
          gqlError.extensions.conflictingMission.id.toString()
        ]
      );
    }
    if (graphQLErrorMatchesCode(gqlError, "MISSION_ALREADY_ENDED")) {
      return (
        gqlError.extensions.missionEnd &&
        gqlError.extensions.missionEnd.submitter.id !== this.store.userId()
      );
    }
    if (graphQLErrorMatchesCode(gqlError, "OVERLAPPING_ACTIVITIES")) {
      return (
        gqlError.extensions.conflictingActivity &&
        gqlError.extensions.conflictingActivity.submitter.id !==
          this.store.userId() &&
        !this.store.getEntity("activities")[
          gqlError.extensions.conflictingActivity.id.toString()
        ]
      );
    }
  };

  shouldProposeRefresh = error => {
    return (
      isGraphQLError(error) &&
      error.graphQLErrors.some(e => this.graphQLErrorImpliesNotUpToDateData(e))
    );
  };

  pushNewTeamActivityEvent = async ({
    activityType,
    missionActivities,
    missionId,
    startTime,
    team = [],
    endTime = null,
    comment = null,
    driverId = null,
    switchMode = true,
    forceNonBatchable = false
  }) => {
    if (team.length === 0)
      return await this.pushNewActivityEvent({
        activityType,
        missionActivities,
        missionId,
        startTime,
        endTime,
        comment,
        switchMode,
        forceNonBatchable
      });

    const teamToType = {};
    team.forEach(id => {
      if (activityType === ACTIVITIES.drive.name && driverId) {
        teamToType[id] =
          id === driverId ? ACTIVITIES.drive.name : ACTIVITIES.support.name;
      } else teamToType[id] = activityType;
    });

    const groupId = this.store.generateId("nextRequestGroupId");

    const userId = this.store.userId();
    let baseActivityResult = null;
    if (team.includes(userId)) {
      baseActivityResult = this.pushNewActivityEvent({
        activityType: teamToType[userId],
        missionActivities,
        missionId,
        startTime,
        userId: userId,
        endTime,
        comment,
        switchMode,
        forceKillSisterActivitiesOnFail: team.length > 1,
        forceNonBatchable,
        groupId
      });
    }

    if (!baseActivityResult || !baseActivityResult.error) {
      team
        .filter(id => id !== userId)
        .forEach(async id => {
          this.pushNewActivityEvent({
            activityType: teamToType[id],
            missionActivities,
            missionId,
            startTime,
            userId: id,
            endTime,
            comment,
            switchMode,
            groupId,
            immediateSubmit: false
          });
        });
    }
  };

  formatLogActivityError = (gqlError, user, selfId) => {
    if (graphQLErrorMatchesCode(gqlError, "OVERLAPPING_MISSIONS")) {
      if (!user) {
        return "L'utilisateur a déjà une mission en cours.";
      }
      return `${formatNameInGqlError(user, selfId, true)} ${
        user.id === selfId ? "avez" : "a"
      } déjà une mission en cours démarrée par ${formatNameInGqlError(
        gqlError.extensions.conflictingMission.submitter,
        selfId,
        false,
        true
      )} le ${formatDay(
        getTime(gqlError.extensions.conflictingMission)
      )} à ${formatTimeOfDay(
        getTime(gqlError.extensions.conflictingMission)
      )}.`;
    }
    if (graphQLErrorMatchesCode(gqlError, "MISSION_ALREADY_ENDED")) {
      if (gqlError.extensions.missionEnd) {
        return `La mission a déjà été terminée par ${formatNameInGqlError(
          gqlError.extensions.missionEnd.submitter,
          selfId,
          false,
          true
        )} à ${formatTimeOfDay(gqlError.extensions.missionEnd.endTime)}.`;
      }
    }
    if (graphQLErrorMatchesCode(gqlError, "OVERLAPPING_ACTIVITIES")) {
      return `Conflit avec ${
        gqlError.extensions.conflictingActivity
          ? `l'activité ${
              ACTIVITIES[gqlError.extensions.conflictingActivity.type].label
            } démarrée le ${formatDay(
              gqlError.extensions.conflictingActivity.startTime
            )} à ${formatTimeOfDay(
              gqlError.extensions.conflictingActivity.startTime
            )} et enregistrée par ${formatNameInGqlError(
              gqlError.extensions.conflictingActivity.submitter,
              selfId,
              false,
              true
            )}`
          : "d'autres activités de l'utilisateur"
      }.`;
    }
  };

  pushNewActivityEvent = async ({
    activityType,
    missionActivities,
    missionId,
    startTime,
    userId = null,
    endTime = null,
    comment = null,
    switchMode = true,
    groupId = null,
    forceKillSisterActivitiesOnFail = false,
    forceNonBatchable = false
  }) => {
    const actualUserId = userId || this.store.userId();
    const newActivity = {
      type: activityType,
      missionId,
      startTime,
      endTime,
      userId: actualUserId
    };

    if (comment) newActivity.context = { comment };

    const updateStore = (store, requestId) => {
      if (switchMode) {
        const currentActivity = missionActivities.find(
          a => a.userId === actualUserId && !a.endTime
        );
        if (currentActivity) {
          this.store.updateEntityObject(
            currentActivity.id,
            "activities",
            { endTime: truncateMinute(startTime) },
            requestId
          );
        }
      }
      const newItemId = this.store.createEntityObject(
        {
          ...newActivity,
          startTime: truncateMinute(startTime),
          endTime: endTime ? truncateMinute(endTime) : null
        },
        "activities",
        requestId
      );
      return {
        activityId: newItemId,
        requestId,
        switchMode,
        endTime,
        actualUserId,
        startTime,
        forceKillSisterActivitiesOnFail,
        groupId,
        type: activityType
      };
    };

    return await this.submitAction(
      LOG_ACTIVITY_MUTATION,
      { ...newActivity, switch: switchMode },
      updateStore,
      ["activities"],
      "logActivity",
      !forceNonBatchable && !forceKillSisterActivitiesOnFail,
      groupId
    );
  };

  editActivityEvent = async (
    activityEvent,
    actionType,
    missionActivities,
    newStartTime = null,
    newEndTime = null,
    comment = null,
    forAllTeam = false
  ) => {
    if (forAllTeam) {
      const activitiesToEdit = missionActivities.filter(
        a =>
          getTime(a) === getTime(activityEvent) &&
          a.endTime === activityEvent.endTime
      );
      activitiesToEdit
        .filter(a => a.userId === this.store.userId())
        .map(a =>
          this.editActivityEvent(
            a,
            actionType,
            missionActivities,
            newStartTime,
            newEndTime,
            comment,
            false
          )
        );
      activitiesToEdit
        .filter(a => a.userId !== this.store.userId())
        .map(a =>
          this.editActivityEvent(
            a,
            actionType,
            missionActivities,
            newStartTime,
            newEndTime,
            comment,
            false
          )
        );
      return;
    }

    const payload = {
      activityId: activityEvent.id
    };

    if (comment) payload.context = { comment };

    if (actionType !== "cancel") {
      payload.startTime = newStartTime;
      payload.endTime = newEndTime;
      payload.removeEndTime = !newEndTime;
    }

    const updateStore = (store, requestId) => {
      if (actionType === "cancel") {
        this.store.deleteEntityObject(
          activityEvent.id,
          "activities",
          requestId
        );
      } else {
        this.store.updateEntityObject(
          activityEvent.id,
          "activities",
          {
            startTime: truncateMinute(newStartTime),
            endTime: newEndTime ? truncateMinute(newEndTime) : null
          },
          requestId
        );
      }
      return {
        activityId: activityEvent.id,
        actionType,
        newEndTime,
        userId: activityEvent.userId,
        type: activityEvent.type
      };
    };

    await this.submitAction(
      actionType === "cancel"
        ? CANCEL_ACTIVITY_MUTATION
        : EDIT_ACTIVITY_MUTATION,
      payload,
      updateStore,
      ["activities"],
      "cancelOrEditActivity",
      !activityEvent.id.toString().startsWith("temp")
    );
  };

  beginNewMission = async ({
    name,
    firstActivityType,
    team = null,
    vehicleRegistrationNumber = null,
    vehicleId = null,
    driverId = null,
    startLocation = null
  }) => {
    const missionPayload = {
      name
    };

    if (vehicleId) missionPayload.context = { vehicleId };
    else if (vehicleRegistrationNumber)
      missionPayload.context = { vehicleRegistrationNumber };

    let updateMissionStore;

    const missionIdPromise = new Promise((resolve, reject) => {
      const _updateMissionStore = (store, requestId) => {
        const mission = {
          name,
          context: missionPayload.context || {},
          ended: false
        };
        const missionId = this.store.createEntityObject(
          mission,
          "missions",
          requestId
        );
        resolve(missionId);
        return { missionId };
      };
      updateMissionStore = _updateMissionStore;
    });

    const createMission = this.submitAction(
      CREATE_MISSION_MUTATION,
      missionPayload,
      updateMissionStore,
      ["missions"],
      "beginMission",
      false
    );

    const missionCurrentId = await missionIdPromise;

    return await Promise.all([
      createMission,
      this.pushNewTeamActivityEvent({
        activityType: firstActivityType,
        missionActivities: [],
        missionId: missionCurrentId,
        startTime: now(),
        team,
        driverId,
        forceNonBatchable: true
      }),
      startLocation
        ? this.logLocation({
            address: startLocation,
            missionId: missionCurrentId,
            isStart: true
          })
        : null
    ]);
  };

  logLocation = async ({ address, missionId, isStart }) => {
    const formattedAddress = address.id
      ? address
      : address.manual
      ? { manual: address.manual, name: address.name }
      : address.properties
      ? { ...address.properties, postalCode: address.properties.postcode }
      : typeof address === "string"
      ? { manual: true, name: address }
      : null;

    const payload = {
      missionId,
      type: isStart ? "mission_start_location" : "mission_end_location"
    };
    if (address.id) payload.companyKnownAddressId = address.id;
    else if (address.manual) payload.manualAddress = address.name;
    else payload.geoApiData = address;

    const updateStore = (store, requestId) => {
      this.store.updateEntityObject(
        missionId,
        "missions",
        { [isStart ? "startLocation" : "endLocation"]: formattedAddress },
        requestId
      );
      return { missionId, isStart };
    };

    await this.submitAction(
      LOG_LOCATION_MUTATION,
      payload,
      updateStore,
      ["missions"],
      "logLocation",
      true
    );
  };

  endMissionForTeam = async ({
    endTime,
    expenditures,
    mission,
    team = [],
    comment = null,
    endLocation = null
  }) => {
    if (team.length === 0)
      return await this.endMission({
        endTime,
        mission,
        expenditures,
        comment,
        endLocation
      });

    const userId = this.store.userId();
    if (team.includes(userId)) {
      await this.endMission({
        endTime,
        mission,
        userId,
        expenditures,
        comment,
        endLocation
      });
    }

    return await Promise.all(
      team
        .filter(id => id !== userId)
        .map(id =>
          this.endMission({
            endTime,
            mission,
            userId: id,
            expenditures
          })
        )
    );
  };

  endMission = async ({
    endTime,
    expenditures,
    mission,
    userId = null,
    comment = null,
    endLocation = null
  }) => {
    const missionId = mission.id;
    const actualUserId = userId || this.store.userId();
    const endMissionPayload = {
      endTime,
      missionId,
      userId: actualUserId
    };
    const updateStore = (store, requestId) => {
      const currentActivity = values(this.store.getEntity("activities")).find(
        a => a.userId === actualUserId && !a.endTime
      );
      if (currentActivity) {
        this.store.updateEntityObject(
          currentActivity.id,
          "activities",
          { endTime: truncateMinute(endTime) },
          requestId
        );
      }
      this.store.updateEntityObject(
        missionId,
        "missions",
        { ended: true },
        requestId
      );
      return {
        userId: actualUserId,
        missionId,
        name: mission.name,
        currentActivityId: currentActivity ? currentActivity.id : null
      };
    };

    await Promise.all([
      this.submitAction(
        END_MISSION_MUTATION,
        endMissionPayload,
        updateStore,
        ["activities", "missions"],
        "endMission",
        true
      ),
      this.editExpenditures(
        expenditures,
        mission.expenditures,
        missionId,
        userId
      ),
      comment ? this.logComment({ text: comment, missionId }) : null,
      endLocation
        ? this.logLocation({ address: endLocation, missionId, isStart: false })
        : null
    ]);
  };

  validateMission = async mission => {
    const userId = this.store.userId();
    const validation = {
      receptionTime: now(),
      submitterId: userId,
      userId: userId
    };
    const update = { ended: true, validation };

    const updateStore = (store, requestId) => {
      this.store.updateEntityObject(mission.id, "missions", update, requestId);
      return { validation };
    };

    await this.submitAction(
      VALIDATE_MISSION_MUTATION,
      { missionId: mission.id, userId: this.store.userId() },
      updateStore,
      ["missions"],
      "validateMission"
    );
  };

  editExpendituresForTeam = async (
    newExpenditures,
    oldMissionExpenditures,
    missionId,
    team = []
  ) => {
    if (team.length === 0) {
      return this.editExpenditures(
        newExpenditures,
        oldMissionExpenditures,
        missionId
      );
    }
    return Promise.all(
      team.map(id =>
        this.editExpenditures(
          newExpenditures,
          oldMissionExpenditures,
          missionId,
          id
        )
      )
    );
  };

  editExpenditures = async (
    newExpenditures,
    oldMissionExpenditures,
    missionId,
    userId = null
  ) => {
    const oldUserExpenditures = oldMissionExpenditures.filter(
      e => e.userId === userId || this.store.userId()
    );
    return await Promise.all([
      ...map(newExpenditures, (checked, type) => {
        if (checked && !oldUserExpenditures.find(e => e.type === type)) {
          return this.logExpenditure({ type, missionId, userId });
        }
        return Promise.resolve();
      }),
      ...oldUserExpenditures.map(e => {
        if (
          !find(newExpenditures, (checked, type) => checked && type === e.type)
        ) {
          return this.cancelExpenditure(e);
        }
        return Promise.resolve();
      })
    ]);
  };

  logExpenditureForTeam = async ({ type, missionId, team = [] }) => {
    if (team.length === 0) {
      return this.logExpenditure({ type, missionId });
    }
    return Promise.all(
      team.map(id => this.logExpenditure({ type, missionId, userId: id }))
    );
  };

  logExpenditure = async ({ type, missionId, userId = null }) => {
    const actualUserId = userId || this.store.userId();
    const newExpenditure = {
      type,
      missionId,
      userId: actualUserId
    };

    const updateStore = (store, requestId) => {
      this.store.createEntityObject(newExpenditure, "expenditures", requestId);
      return { missionId, userId: actualUserId, type };
    };

    await this.submitAction(
      LOG_EXPENDITURE_MUTATION,
      newExpenditure,
      updateStore,
      ["expenditures"],
      "logExpenditure",
      true
    );
  };

  cancelExpenditure = async expenditureToCancel => {
    if (isPendingSubmission(expenditureToCancel)) {
      if (
        this.api.isCurrentlySubmittingRequests() ||
        expenditureToCancel.pendingUpdates.some(upd => upd.type === "delete")
      )
        return;

      const pendingCreationRequest = this.store
        .pendingRequests()
        .find(r => r.id === expenditureToCancel.pendingUpdates[0].requestId);
      if (pendingCreationRequest)
        return await this.store.clearPendingRequest(pendingCreationRequest);
    }

    const updateStore = (store, requestId) => {
      this.store.deleteEntityObject(
        expenditureToCancel.id,
        "expenditures",
        requestId
      );
      return { expenditureId: expenditureToCancel.id };
    };

    await this.submitAction(
      CANCEL_EXPENDITURE_MUTATION,
      { expenditureId: expenditureToCancel.id },
      updateStore,
      ["expenditures"],
      "cancelExpenditure",
      true
    );
  };

  logComment = async ({ text, missionId }) => {
    const newComment = {
      text,
      missionId,
      submitterId: this.store.userId()
    };

    const updateStore = (store, requestId) => {
      this.store.createEntityObject(
        { ...newComment, receptionTime: Date.now() },
        "comments",
        requestId
      );
      return { missionId };
    };

    await this.submitAction(
      LOG_COMMENT_MUTATION,
      newComment,
      updateStore,
      ["comments"],
      "logComment",
      true
    );
  };

  cancelComment = async commentToCancel => {
    if (isPendingSubmission(commentToCancel)) {
      if (
        this.api.isCurrentlySubmittingRequests() ||
        commentToCancel.pendingUpdates.some(upd => upd.type === "delete")
      )
        return;

      const pendingCreationRequest = this.store
        .pendingRequests()
        .find(r => r.id === commentToCancel.pendingUpdates[0].requestId);
      if (pendingCreationRequest)
        return await this.store.clearPendingRequest(pendingCreationRequest);
    }

    const updateStore = (store, requestId) => {
      this.store.deleteEntityObject(commentToCancel.id, "comments", requestId);
      return { commentId: commentToCancel.id };
    };

    await this.submitAction(
      CANCEL_COMMENT_MUTATION,
      { commentId: commentToCancel.id },
      updateStore,
      ["comments"],
      "cancelComment",
      true
    );
  };
}

export function ActionsContextProvider({ children }) {
  const store = useStoreSyncedWithLocalStorage();
  const api = useApi();
  const modals = useModals();
  const alerts = useSnackbarAlerts();

  const actions = React.useState(new Actions(store, api, modals, alerts))[0];

  return (
    <ActionsContext.Provider value={actions}>
      {children}
    </ActionsContext.Provider>
  );
}

export const useActions = () => React.useContext(ActionsContext);
