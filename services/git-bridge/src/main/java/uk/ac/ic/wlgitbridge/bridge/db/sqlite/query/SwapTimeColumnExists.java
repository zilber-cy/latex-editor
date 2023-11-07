package uk.ac.ic.wlgitbridge.bridge.db.sqlite.query;

import uk.ac.ic.wlgitbridge.bridge.db.sqlite.SQLQuery;

import java.sql.ResultSet;
import java.sql.SQLException;

public class SwapTimeColumnExists implements SQLQuery<Boolean> {
    private static final String SWAP_TIME_COLUMN_EXISTS =
            "PRAGMA table_info(`projects`)";

    @Override
    public String getSQL() {
        return SWAP_TIME_COLUMN_EXISTS;
    }

    @Override
    public Boolean processResultSet(ResultSet resultSet) throws SQLException {
        while (resultSet.next()) {
            if (resultSet.getString(2).equals("swap_time")) {
                return true;
            }
        }
        return false;
    }

}
