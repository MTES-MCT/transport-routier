import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { useApi } from "common/utils/api";
import { useAdminStore } from "../utils/store";
import {
  AugmentedVirtualizedTable,
  CellContent
} from "../components/AugmentedTable";
import { formatPersonName } from "common/utils/coworkers";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import uniqBy from "lodash/uniqBy";
import orderBy from "lodash/orderBy";
import min from "lodash/min";
import max from "lodash/max";
import map from "lodash/map";
import sum from "lodash/sum";
import groupBy from "lodash/groupBy";
import mapValues from "lodash/mapValues";
import Paper from "@material-ui/core/Paper";
import {
  DAY,
  formatDay,
  formatTimeOfDay,
  formatTimer,
  now
} from "common/utils/time";
import { formatExpendituresAsOneString } from "common/utils/expenditures";
import Button from "@material-ui/core/Button";
import Drawer from "@material-ui/core/Drawer/Drawer";
import { MissionDetails } from "../components/MissionDetails";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { useSnackbarAlerts } from "../../common/Snackbar";
import { formatApiError } from "common/utils/errors";
import { VALIDATE_MISSION_MUTATION } from "common/utils/apiQueries";

const DEFAULT_WORKER_VALIDATION_TIMEOUT = 7 * DAY;

const useStyles = makeStyles(theme => ({
  title: {
    textAlign: "left",
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center"
  },
  explanation: {
    marginBottom: theme.spacing(2),
    fontStyle: "italic",
    textAlign: "justify"
  },
  container: {
    padding: theme.spacing(2),
    flexShrink: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflowY: "hidden"
  },
  subPanel: {
    padding: theme.spacing(2)
  },
  successText: {
    color: theme.palette.success.main
  },
  warningText: {
    color: theme.palette.warning.main
  },
  virtualizedTableContainer: {
    maxHeight: "100%",
    flexShrink: 1,
    overflowY: "hidden"
  },
  collapseWrapper: {
    maxHeight: "100%"
  },
  missionModal: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2)
  },
  row: {
    border: "1px solid #c9d3df",
    borderRadius: 5,
    marginBottom: 12,
    "&:focus": {
      outline: "none"
    },
    "&:hover": {
      background: "#fafbfc",
      cursor: ({ clickableRow }) => (clickableRow ? "pointer" : "inherit")
    }
  },
  header: {
    "&:hover": {
      cursor: "inherit !important"
    }
  },
  tab: {
    maxWidth: 400
  },
  tabContainer: {
    marginBottom: theme.spacing(2)
  },
  validatedRow: {
    backgroundColor: theme.palette.success.light,
    "&:hover": {
      backgroundColor: theme.palette.success.light
    }
  },
  selectedRow: {
    background: theme.palette.primary.lighter
  },
  missionTitle: {
    textTransform: "uppercase",
    color: theme.palette.primary.main
  }
}));

export function computeMissionStats(m, users) {
  const activitiesWithUserId = m.activities
    .map(a => ({
      ...a,
      userId: a.userId || a.user.id,
      user: a.user || users.find(u => u.id === a.userId)
    }))
    .filter(a => !!a.user);
  const members = uniqBy(
    activitiesWithUserId.map(a => a.user),
    u => u.id
  );
  const validatorIds = m.validations.map(v => v.submitterId);
  const validatedByAllMembers = members.every(user =>
    validatorIds.includes(user.id)
  );
  const activitiesByUser = groupBy(
    activitiesWithUserId,
    a => a.userId || a.user.id
  );
  const isComplete = activitiesWithUserId.every(a => !!a.endTime);
  const userStats = mapValues(activitiesByUser, (activities, userId) => {
    const _activities = orderBy(activities, ["startTime", "endTime"]);
    const startTime = min(_activities.map(a => a.startTime));
    const endTime = max(_activities.map(a => a.endTime));
    const totalWorkDuration = sum(
      _activities.map(a => a.endTime - a.startTime)
    );
    return {
      activities: _activities,
      user: members.find(m => m.id.toString() === userId),
      startTime,
      endTime,
      service: endTime - startTime,
      totalWorkDuration,
      isComplete,
      breakDuration: endTime - startTime - totalWorkDuration,
      expenditureAggs: mapValues(
        groupBy(
          m.expenditures.filter(e => e.userId.toString() === userId),
          e => e.type
        ),
        exps => exps.length
      ),
      validation: m.validations.find(v => v.submitterId.toString() === userId)
    };
  });
  const startTime = min(m.activities.map(a => a.startTime));
  const endTime = max(m.activities.map(a => a.endTime));
  return {
    ...m,
    activities: activitiesWithUserId,
    startTime,
    endTime,
    validatedByAllMembers,
    userStats
  };
}

function _ValidationPanel({ containerRef, width, setShouldRefreshData }) {
  const api = useApi();
  const adminStore = useAdminStore();
  const alerts = useSnackbarAlerts();
  const location = useLocation();
  const history = useHistory();

  const [tab, setTab] = React.useState(0);
  const classes = useStyles({ clickableRow: tab === 0 });

  const ref = React.useRef();

  const showExpenditures = adminStore.companies.some(
    c => c.settings.requireExpenditures
  );

  const commonCols = [
    {
      label: "Employé",
      name: "user",
      align: "left",
      minWidth: 200,
      format: formatPersonName,
      overflowTooltip: true,
      alwaysShowTooltip: true
    },
    {
      label: "Début",
      name: "startTime",
      align: "left",
      format: formatTimeOfDay,
      minWidth: 80
    },
    {
      label: "Fin",
      name: "endTime",
      align: "left",
      format: (time, entry) =>
        entry.isComplete ? (
          formatTimeOfDay(time)
        ) : (
          <span className={classes.warningText}>
            <strong>En cours</strong>
          </span>
        ),
      minWidth: 80
    },
    {
      label: "Amplitude",
      name: "service",
      format: (time, entry) =>
        entry.isComplete ? (
          formatTimer(time)
        ) : (
          <span className={classes.warningText}>
            <strong>En cours</strong>
          </span>
        ),
      align: "right",
      minWidth: 100
    },
    {
      label: "Travail",
      name: "totalWorkDuration",
      format: (time, entry) =>
        entry.isComplete ? (
          formatTimer(time)
        ) : (
          <span className={classes.warningText}>
            <strong>En cours</strong>
          </span>
        ),
      align: "right",
      minWidth: 100
    },
    {
      label: "Repos",
      name: "breakDuration",
      format: (time, entry) =>
        entry.isComplete ? (
          formatTimer(time)
        ) : (
          <span className={classes.warningText}>
            <strong>En cours</strong>
          </span>
        ),
      align: "right",
      minWidth: 100
    },
    showExpenditures && {
      label: "Frais",
      name: "expenditureAggs",
      format: exps => (exps ? formatExpendituresAsOneString(exps) : null),
      align: "left",
      minWidth: 150,
      overflowTooltip: true
    }
  ].filter(Boolean);

  const validationCol = {
    label: "Validation salarié",
    name: "validation",
    format: validation => (
      <Typography
        className={`${validation ? classes.successText : classes.warningText}`}
      >
        {validation ? "✅ Validé" : "⏳ En attente"}
      </Typography>
    ),
    align: "left",
    minWidth: 200
  };

  const columns = tab === 0 ? commonCols : [...commonCols, validationCol];

  const allMissions = adminStore.missions.map(m =>
    computeMissionStats(m, adminStore.users)
  );

  const nonValidatedByAdminMissions = allMissions
    .filter(m => !m.adminValidation)
    .filter(m => m.activities.length > 0);

  const nowTime = now();

  const missionsValidatedByAllWorkers = nonValidatedByAdminMissions.filter(
    m =>
      m.validatedByAllMembers ||
      m.endTime + DEFAULT_WORKER_VALIDATION_TIMEOUT < nowTime
  );
  const missionsNotValidatedByAllWorkers = nonValidatedByAdminMissions.filter(
    m =>
      !m.validatedByAllMembers &&
      m.endTime + DEFAULT_WORKER_VALIDATION_TIMEOUT >= nowTime
  );

  const [missionIdOnFocus, setMissionIdOnFocus] = React.useState(null);

  React.useEffect(() => {
    const queryString = new URLSearchParams(location.search);
    const missionId = parseInt(queryString.get("mission"));

    setMissionIdOnFocus(missionId || null);
  }, [location]);

  return (
    <Paper className={classes.container} variant="outlined">
      <Tabs
        value={tab}
        indicatorColor="primary"
        textColor="primary"
        onChange={(e, newTab) => {
          setTab(newTab);
          ref.current.recomputeRowHeights();
        }}
        className={classes.tabContainer}
        variant="scrollable"
      >
        <Tab
          className={classes.tab}
          label={`A valider (${missionsValidatedByAllWorkers.length})`}
        />
        <Tab
          className={classes.tab}
          label={`En attente de validation par les salariés (${missionsNotValidatedByAllWorkers.length})`}
        />
      </Tabs>
      <Typography className={classes.explanation}>
        {tab === 0
          ? "Les missions suivantes ont été terminées et validées par le(s) salarié(s) concerné(s) et sont prêtes à être validées par un gestionnaire."
          : "Les missions suivantes sont terminées mais n'ont pas encore été validées par tous les salariés concernés."}
      </Typography>
      <AugmentedVirtualizedTable
        columns={columns}
        entries={
          tab === 0
            ? missionsValidatedByAllWorkers
            : missionsNotValidatedByAllWorkers
        }
        ref={ref}
        editable={false}
        rowHeight={(index, mission) =>
          72 + 30 * Object.keys(mission.userStats).length
        }
        maxHeight={"100%"}
        defaultSortBy="startTime"
        defaultSortType="desc"
        className={classes.virtualizedTableContainer}
        onRowClick={
          tab === 0
            ? ({ event, rowData }) => {
                event.preventDefault();
                setMissionIdOnFocus(rowData.id);
              }
            : null
        }
        rowRenderer={({ rowData: mission, index, ...props }) => {
          return (
            <Box
              key={props.key}
              className={`${classes.row} ${
                missionIdOnFocus && mission.id === missionIdOnFocus
                  ? classes.selectedRow
                  : ""
              }`}
              style={{
                ...props.style,
                display: "block",
                height: 60 + 30 * Object.keys(mission.userStats).length
              }}
              onClick={
                props.onRowClick
                  ? e => props.onRowClick({ event: e, rowData: mission })
                  : null
              }
            >
              <Box
                style={{ height: 60 }}
                className="flex-row-space-between"
                px={1}
              >
                <Typography variant="h6" className={classes.missionTitle}>
                  Mission {mission.name ? mission.name : "sans nom"} du{" "}
                  {formatDay(mission.startTime)}
                </Typography>
                {tab === 0 && (
                  <Button
                    aria-label="Valider"
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={async e => {
                      e.stopPropagation();
                      adminStore.setMissions(missions =>
                        missions.filter(m => m.id !== mission.id)
                      );
                      try {
                        await api.graphQlMutate(VALIDATE_MISSION_MUTATION, {
                          missionId: mission.id
                        });
                        alerts.success(
                          `La mission${
                            mission.name ? " " + mission.name : ""
                          } a été validée avec succès !`,
                          mission.id,
                          6000
                        );
                      } catch (err) {
                        alerts.error(formatApiError(err), mission.id, 6000);
                      }
                    }}
                  >
                    Valider
                  </Button>
                )}
              </Box>
              {map(mission.userStats, (stats, userId) => (
                <Box
                  style={{ height: 30, alignItems: "center" }}
                  key={userId}
                  className="flex-row"
                >
                  {props.columns.map((column, index) => {
                    const col = columns[index];
                    return (
                      <Box
                        className={column.props.className}
                        key={column.key}
                        style={column.props.style}
                        role={column.props.role}
                      >
                        <CellContent
                          column={col}
                          cellData={stats[col.name]}
                          rowData={stats}
                          onFocus={false}
                        />
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          );
        }}
        headerClassName={`${classes.header} ${classes.row}`}
      />
      <Drawer
        anchor="right"
        open={!!missionIdOnFocus}
        onClose={() => {
          history.push("/admin/validations");
        }}
        className={classes.missionModalContainer}
        PaperProps={{
          className: classes.missionModal,
          style: {
            minWidth: isWidthUp("sm", width) ? 785 : "100vw",
            maxWidth: isWidthUp("md", width) ? 735 : "100vw"
          }
        }}
      >
        <MissionDetails
          missionId={missionIdOnFocus}
          day={location.state ? location.state.day : null}
          mission={allMissions.find(m => m.id === missionIdOnFocus)}
          handleClose={() => history.push("/admin/validations")}
          setShouldRefreshActivityPanel={setShouldRefreshData}
        />
      </Drawer>
    </Paper>
  );
}

const ValidationPanel = withWidth()(_ValidationPanel);

export default ValidationPanel;
