import React from "react";
import { RestIcon, TruckIcon, WorkIcon } from "./icons";

export const SWITCH_ACTIVITIES = {
  drive: {
    name: "drive",
    label: "Déplacement",
    renderIcon: props => <TruckIcon {...props} />,
    color: "#1CE88C",
    canBeFirst: true
  },
  work: {
    name: "work",
    label: "Autre tâche",
    renderIcon: props => <WorkIcon {...props} />,
    canBeFirst: true,
    color: "#F3A817"
  },
  break: {
    name: "break",
    label: "Pause",
    renderIcon: props => <RestIcon {...props} />,
    color: "#AA7AF8"
  }
};

export const ACTIVITIES = {
  ...SWITCH_ACTIVITIES,
  support: {
    name: "support",
    label: "Accompagnement",
    renderIcon: props => <TruckIcon {...props} />,
    color: "#1CE88C"
  }
};

export const TIMEABLE_ACTIVITIES = {
  drive: ACTIVITIES.drive,
  work: ACTIVITIES.work,
  support: ACTIVITIES.support
};

export function parseActivityPayloadFromBackend(activity) {
  return {
    id: activity.id,
    type: activity.type,
    startTime: activity.startTime,
    endTime: activity.endTime,
    missionId: activity.missionId,
    userId: activity.userId,
    context: activity.context
  };
}

export function filterActivitiesOverlappingPeriod(
  activities,
  periodStart,
  periodEnd
) {
  return activities.filter(
    a =>
      (!periodStart || !a.endTime || a.endTime > periodStart) &&
      (!periodEnd || a.startTime < periodEnd)
  );
}
