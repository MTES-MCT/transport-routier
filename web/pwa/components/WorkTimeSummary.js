import React from "react";
import Typography from "@material-ui/core/Typography";
import {
  DAY,
  formatDateTime,
  formatTimeOfDay,
  formatTimer,
  getStartOfDay,
  LONG_BREAK_DURATION,
  now
} from "common/utils/time";
import Box from "@material-ui/core/Box";
import { computeTotalActivityDurations } from "common/utils/metrics";
import Divider from "@material-ui/core/Divider";
import Card from "@material-ui/core/Card";
import Grid from "@material-ui/core/Grid";
import makeStyles from "@material-ui/core/styles/makeStyles";
import omit from "lodash/omit";
import { EXPENDITURES } from "common/utils/expenditures";
import { sortEvents } from "common/utils/events";
import { filterActivitiesOverlappingPeriod } from "common/utils/activities";

const useStyles = makeStyles(theme => ({
  overviewTimer: {
    padding: theme.spacing(1),
    fontWeight: "bold",
    fontSize: "200%"
  },
  additionalInfo: {
    marginTop: ({ disableTopMargin }) =>
      disableTopMargin ? 0 : theme.spacing(4),
    marginBottom: ({ disableBottomMargin }) =>
      disableBottomMargin ? 0 : theme.spacing(4)
  }
}));

function formatRangeString(startTime, endTime) {
  return getStartOfDay(startTime) === getStartOfDay(endTime - 1)
    ? `De ${formatTimeOfDay(startTime)} à ${formatTimeOfDay(endTime)}`
    : `Du ${formatDateTime(startTime)} au ${formatDateTime(endTime)}`;
}

export function WorkTimeSummaryKpi({
  label,
  value,
  subText,
  hideSubText,
  render = null,
  ...other
}) {
  const classes = useStyles();

  return (
    <Card
      {...omit(other, ["style"])}
      style={{ textAlign: "center", ...(other.style || {}) }}
    >
      <Box px={2} py={1} m={"auto"}>
        <Typography>{label}</Typography>
        {render ? (
          render()
        ) : (
          <>
            <Typography className={classes.overviewTimer} variant="h1">
              {value}
            </Typography>
            {subText && (
              <Typography className={hideSubText && "hidden"} variant="caption">
                {subText}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}

export function WorkTimeSummaryAdditionalInfo({
  children,
  disableTopMargin = false,
  disableBottomMargin = true,
  disablePadding = false,
  ...other
}) {
  const classes = useStyles({ disableTopMargin, disableBottomMargin });
  return (
    <Card
      className={`${classes.additionalInfo} ${other.className || ""}`}
      {...omit(other, ["className"])}
    >
      <Box
        px={disablePadding ? 0 : 2}
        py={disablePadding ? 0 : 1}
        mx={"auto"}
        style={{ textAlign: "justify" }}
      >
        {React.Children.map(children, (child, index) => [
          child,
          index < React.Children.count(children) - 1 ? (
            <Divider key={index} />
          ) : null
        ])}
      </Box>
    </Card>
  );
}

export function WorkTimeSummaryKpiGrid({ metrics, cardProps = {} }) {
  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems={"baseline"}
      spacing={2}
    >
      {metrics.map((metric, index) => (
        <Grid key={index} item xs={metric.fullWidth ? 12 : true}>
          <WorkTimeSummaryKpi {...metric} {...cardProps} />
        </Grid>
      ))}
    </Grid>
  );
}

export function computeTimesAndDurationsFromActivities(
  activities,
  fromTime = null,
  untilTime = null
) {
  const filteredActivities = filterActivitiesOverlappingPeriod(
    activities,
    fromTime,
    untilTime
  );

  if (filteredActivities.length === 0)
    return {
      startTime: null,
      endTime: null,
      timers: null,
      innerLongBreaks: [],
      filteredActivities: [],
      groupedActivities: []
    };

  const endTime = Math.min(
    filteredActivities[filteredActivities.length - 1].endTime || now(),
    untilTime || now()
  );
  const startTime = Math.max(filteredActivities[0].startTime, fromTime);

  const innerLongBreaks = [];
  const groupedActivities = [[filteredActivities[0]]];
  filteredActivities.forEach((activity, index) => {
    if (index > 0) {
      const previousActivity = filteredActivities[index - 1];
      const breakDuration = activity.startTime - previousActivity.endTime;
      if (breakDuration >= LONG_BREAK_DURATION) {
        innerLongBreaks.push({
          startTime: previousActivity.endTime,
          endTime: activity.startTime,
          duration: breakDuration
        });
        groupedActivities.push([]);
      }
      groupedActivities[groupedActivities.length - 1].push(activity);
    }
  });

  const dayTimers = computeTotalActivityDurations(
    activities,
    fromTime,
    untilTime
  );

  return {
    startTime,
    endTime,
    timers: dayTimers,
    innerLongBreaks,
    filteredActivities,
    groupedActivities
  };
}

export function renderMissionKpis(
  kpis,
  serviceLabel = "Amplitude",
  showInnerBreaksInsteadOfService = false
) {
  const { timers, startTime, endTime, innerLongBreaks } = kpis;

  const formattedKpis = [];

  let subText = null;
  if (showInnerBreaksInsteadOfService && innerLongBreaks.length > 0) {
    const innerLongBreak = innerLongBreaks[0];
    subText = formatRangeString(
      innerLongBreak.startTime,
      innerLongBreak.endTime
    );
    formattedKpis.push({
      label: "Repos journalier",
      value: formatTimer(innerLongBreak.duration),
      subText
    });
  } else {
    subText = formatRangeString(startTime, endTime);
    formattedKpis.push({
      label: kpis.innerLongBreaks.length > 0 ? "Durée" : serviceLabel,
      value: formatTimer(timers ? timers.total : 0),
      subText
    });
  }

  formattedKpis.push({
    label: "Temps de travail",
    value: formatTimer(timers ? timers.totalWork : 0),
    subText,
    hideSubText: true
  });

  return formattedKpis;
}

export function computePeriodStats(missions, fromTime, untilTime) {
  const activities = missions.reduce(
    (acts, mission) => [...acts, ...mission.activities],
    []
  );

  sortEvents(activities);

  let civilDay = fromTime;
  let workedDays = 0;
  let activityIndex = 0;

  while (civilDay < untilTime && activityIndex < activities.length) {
    const nextDay = civilDay + DAY;
    const activity = activities[activityIndex];

    if (activity.endTime && activity.endTime < civilDay) activityIndex++;
    else if (activity.startTime < nextDay) {
      workedDays++;
      civilDay = nextDay;
    } else civilDay = nextDay;
  }

  const {
    timers,
    startTime,
    endTime,
    innerLongBreaks,
    groupedActivities,
    filteredActivities
  } = computeTimesAndDurationsFromActivities(activities, fromTime, untilTime);

  const expendituresCount = {};
  missions.forEach(m => {
    m.expenditures.forEach(e => {
      expendituresCount[e.type] = (expendituresCount[e.type] || 0) + 1;
    });
  });

  return {
    timers,
    startTime,
    endTime,
    innerLongBreaks,
    workedDays,
    expendituresCount,
    filteredActivities,
    groupedActivities
  };
}

export function renderPeriodKpis(
  kpis,
  showInnerBreaksInsteadOfService = false
) {
  const formattedKpis = [];

  let subText = null;
  if (showInnerBreaksInsteadOfService && kpis.innerLongBreaks.length > 0) {
    const innerLongBreak = kpis.innerLongBreaks[0];
    subText = formatRangeString(
      innerLongBreak.startTime,
      innerLongBreak.endTime
    );
    formattedKpis.push({
      name: "rest",
      label: "Repos journalier",
      value: formatTimer(innerLongBreak.duration),
      subText
    });
  } else {
    subText = formatRangeString(kpis.startTime, kpis.endTime);
    formattedKpis.push({
      name: "service",
      label: "Amplitude",
      value: formatTimer(kpis.timers ? kpis.timers.total : 0),
      subText
    });
  }

  formattedKpis.push(
    {
      name: "workedDays",
      label: "Jours travaillés",
      value: kpis.workedDays,
      subText,
      hideSubText: true
    },
    {
      name: "workTime",
      label: "Temps de travail",
      value: formatTimer(kpis.timers ? kpis.timers.totalWork : 0),
      subText,
      hideSubText: true
    }
  );
  if (Object.keys(kpis.expendituresCount).length > 0)
    formattedKpis.push({
      name: "expenditures",
      label: "Frais",
      fullWidth: true,
      render: () => (
        <Grid
          container
          direction="row"
          justify="center"
          alignItems={"center"}
          spacing={1}
        >
          {Object.keys(kpis.expendituresCount).map(type => (
            <Grid key={type} item xs>
              <Box py={1} m="auto">
                <Typography
                  variant="body2"
                  style={{
                    textTransform: "capitalize",
                    fontWeight: "bold",
                    whiteSpace: "nowrap"
                  }}
                >
                  {EXPENDITURES[type].plural}
                </Typography>
                <Typography variant="h4" style={{ fontWeight: "bold" }}>
                  {kpis.expendituresCount[type]}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )
    });
  return formattedKpis;
}
