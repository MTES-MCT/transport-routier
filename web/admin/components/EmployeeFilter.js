import React from "react";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { formatPersonName } from "common/utils/coworkers";
import Autocomplete from "@material-ui/lab/Autocomplete";
import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";
import orderBy from "lodash/orderBy";

const useStyles = makeStyles(theme => ({
  formControl: {
    minWidth: 250,
    maxWidth: 500
  },
  chips: {
    display: "flex",
    flexWrap: "wrap"
  },
  chip: {
    margin: 2
  },
  noLabel: {
    marginTop: theme.spacing(3)
  }
}));

export function EmployeeFilter({ users, setUsers }) {
  const classes = useStyles();

  const handleChange = (event, value) => {
    const selectedIds = value.map(u => u.id);
    setUsers(
      users.map(u => ({
        ...u,
        selected: selectedIds.includes(u.id)
      }))
    );
  };

  const selectedUsers = users.filter(user => user.selected);
  return (
    <Autocomplete
      multiple
      id="employee-filter"
      options={orderBy(users, ["firstName", "lastName"], ["asc", "asc"])}
      limitTags={1}
      size="small"
      disableCloseOnSelect
      getOptionLabel={option => formatPersonName(option)}
      renderOption={option => (
        <>
          <Checkbox
            style={{ marginRight: 8 }}
            checked={option.selected || false}
          />
          <span>{formatPersonName(option)}</span>
        </>
      )}
      value={selectedUsers}
      onChange={handleChange}
      renderInput={params => (
        <TextField
          className={classes.formControl}
          {...params}
          variant="outlined"
          label="Employés"
          placeholder="Filtrer les employés"
        />
      )}
    />
  );
}
