import moment from 'moment'
import 'moment/locale/zh-cn'; 
export function formatUtcDate(date) {
  if (date) {
    return moment(date).utc().format('D MMM YYYY, HH:mm:ss') + ' UTC'
  } else {
    return 'N/A'
  }
}
