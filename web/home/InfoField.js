import React from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Alert from "@material-ui/lab/Alert";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles(theme => ({
  fieldName: {
    color: theme.palette.grey[600]
  },
  fieldValue: {
    fontWeight: props => (props.bold ? "bold" : 500)
  },
  actionButton: {
    fontSize: theme.typography.overline.fontSize,
    marginLeft: theme.spacing(4)
  }
}));

export function InfoItem({ name, value, info, bold, actionTitle, action }) {
  const classes = useStyles({ bold });

  return (
    <Box>
      <Grid container wrap="nowrap" spacing={0} alignItems="flex-start">
        <Grid item>
          <Typography className={classes.fieldName} variant="overline">
            {name}
          </Typography>
        </Grid>
        {action && (
          <Grid item>
            <Button
              size="small"
              color="primary"
              variant="contained"
              onClick={action}
              className={classes.actionButton}
            >
              {actionTitle}
            </Button>
          </Grid>
        )}
      </Grid>
      <Typography noWrap className={classes.fieldValue}>
        {value}
      </Typography>
      {info && <Alert severity="info">{info}</Alert>}
    </Box>
  );
}
