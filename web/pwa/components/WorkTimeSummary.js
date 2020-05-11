import React from "react";
import Typography from "@material-ui/core/Typography";
import {
  formatTimeOfDay,
  formatTimer,
  getStartOfWeek,
  WEEK,
  shortPrettyFormatDay,
  prettyFormatDay
} from "common/utils/time";
import Box from "@material-ui/core/Box";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import { computeTotalActivityDurations } from "common/utils/metrics";
import { ACTIVITIES, TIMEABLE_ACTIVITIES } from "common/utils/activities";
import useTheme from "@material-ui/core/styles/useTheme";
import { checkDayRestRespect } from "common/utils/regulation";
import { RegulationCheck } from "./RegulationCheck";
import Divider from "@material-ui/core/Divider";
import { getTime } from "common/utils/events";
import CardContent from "@material-ui/core/CardContent";
import Card from "@material-ui/core/Card";
import Grid from "@material-ui/core/Grid";
import makeStyles from "@material-ui/core/styles/makeStyles";

function Summary({ title, summaryContent, timers, alerts }) {
  const theme = useTheme();
  return (
    <Card className="unshrinkable">
      <CardContent>
        <Box mb={1} className="flex-row-space-between">
          <Typography className="bold">{title}</Typography>
        </Box>
        <Table>
          <TableBody>
            {summaryContent.map((row, index) => (
              <TableRow key={index}>
                <TableCell
                  className="summary-card-table-cell"
                  component="th"
                  scope="row"
                >
                  <Typography variant="body2">{row.stat}</Typography>
                </TableCell>
                <TableCell className="summary-card-table-cell" align="right">
                  <Typography variant="body2" className="bold">
                    {row.value}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {timers && (
          <Box mt={2} className="flex-row-space-between">
            {Object.values(TIMEABLE_ACTIVITIES).map((activity, index) => (
              <div key={index} className="summary-card-timer flex-row-center">
                {activity.renderIcon({
                  className: "activity-card-icon",
                  style: { color: theme.palette[activity.name] }
                })}
                <Typography variant="body2">
                  {` : ${formatTimer(timers[activity.name] || 10)}`}
                </Typography>
              </div>
            ))}
          </Box>
        )}
        {alerts && (
          <Box mt={2}>
            <Divider />
            {alerts.map((alert, index) => (
              <RegulationCheck key={index} check={alert} />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkDaySummary({ dayActivityEvents, followingDayStart }) {
  const dayEnd = getTime(dayActivityEvents[dayActivityEvents.length - 1]);
  const dayStart = getTime(dayActivityEvents[0]);
  const timers = computeTotalActivityDurations(dayActivityEvents);
  const serviceTime = timers["total"];
  const workTime = (timers["drive"] || 0) + (timers["work"] || 0);
  const title = `Journée du ${prettyFormatDay(dayStart)}`;
  return (
    <Summary
      title={title}
      summaryContent={[
        {
          stat: "Amplitude 📅",
          value: `${formatTimer(serviceTime)} (${formatTimeOfDay(
            dayStart
          )}${"\u00A0"}-${"\u00A0"}${formatTimeOfDay(dayEnd)})`
        },
        {
          stat: "Travail 💪",
          value: `${formatTimer(workTime)}`
        }
      ]}
      timers={timers}
      alerts={[checkDayRestRespect(dayEnd, followingDayStart)]}
    />
  );
}

export function WorkWeekSummary({ weekActivityEventsByDay }) {
  const weekStart = getStartOfWeek(getTime(weekActivityEventsByDay[0][0]));
  const timersPerDay = weekActivityEventsByDay.map(dayEvents =>
    computeTotalActivityDurations(dayEvents)
  );
  const weekTimers = {};
  timersPerDay.forEach(timer => {
    Object.values(ACTIVITIES).forEach(activity => {
      weekTimers[activity.name] =
        (weekTimers[activity.name] || 0) + (timer[activity.name] || 0);
    });
    weekTimers["total"] = (weekTimers["total"] || 0) + (timer["total"] || 0);
  });

  const serviceTime = weekTimers["total"];
  const workTime = (weekTimers["drive"] || 0) + (weekTimers["work"] || 0);
  const title = `Semaine du ${shortPrettyFormatDay(
    weekStart
  )} - ${shortPrettyFormatDay(weekStart + WEEK)} `;
  const nRests = 0;
  const nValidRests = 0;
  return (
    <Summary
      title={title}
      summaryContent={[
        {
          stat: "Jours de travail 💪",
          value: `${weekActivityEventsByDay.length}`
        },
        {
          stat: "Amplitude totale 📅",
          value: `${formatTimer(serviceTime)}`
        },
        {
          stat: "Travail total 💪",
          value: `${formatTimer(workTime)}`
        },
        {
          stat: "Repos journaliers valides 😴",
          value: `${nRests}/${nValidRests}`
        }
      ]}
    />
  );
}

const useStyles = makeStyles(theme => ({
  overviewTimer: {
    padding: theme.spacing(1),
    fontWeight: "bold",
    fontSize: "200%"
  }
}));

export function WorkTimeSummaryKpi({ label, value, subText, hideSubText }) {
  const classes = useStyles();

  return (
    <Card>
      <Box p={0.5} m={"auto"}>
        <Typography>{label}</Typography>
        <Typography className={classes.overviewTimer} variant="h1">
          {value}
        </Typography>
        {subText && (
          <Typography className={hideSubText && "hidden"} variant="caption">
            {subText}
          </Typography>
        )}
      </Box>
    </Card>
  );
}

export function WorkTimeSummaryKpiGrid({ metrics }) {
  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems={"center"}
      spacing={2}
    >
      {metrics.map((metric, index) => (
        <Grid key={index} item xs>
          <WorkTimeSummaryKpi {...metric} />
        </Grid>
      ))}
    </Grid>
  );
}

export function computeDayKpis(activityEvents) {
  const dayTimers = computeTotalActivityDurations(activityEvents);
  const serviceHourString = `De ${formatTimeOfDay(
    getTime(activityEvents[0])
  )} à ${formatTimeOfDay(getTime(activityEvents[activityEvents.length - 1]))}`;
  return [
    {
      label: "Amplitude",
      value: formatTimer(dayTimers.total),
      subText: serviceHourString
    },
    {
      label: "Temps de travail",
      value: formatTimer(dayTimers.totalWork),
      subText: serviceHourString,
      hideSubText: true
    }
  ];
}

export function computeWeekKpis(activityEventsPerDay) {
  const timersPerDay = activityEventsPerDay.map(dayEvents =>
    computeTotalActivityDurations(dayEvents)
  );
  const weekTimers = {};
  timersPerDay.forEach(timer => {
    Object.values(ACTIVITIES).forEach(activity => {
      weekTimers[activity.name] =
        (weekTimers[activity.name] || 0) + (timer[activity.name] || 0);
    });
    weekTimers["totalWork"] =
      (weekTimers["totalWork"] || 0) + (timer["totalWork"] || 0);
  });

  return [
    {
      label: "Jours travaillés",
      value: activityEventsPerDay.length
    },
    {
      label: "Temps de travail",
      value: formatTimer(weekTimers.totalWork)
    }
  ];
}
