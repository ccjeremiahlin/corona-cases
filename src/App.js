import axios from 'axios';
import dayjs from 'dayjs';
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  Grid,
  Link,
  Paper,
  Toolbar,
  Typography,
} from '@material-ui/core';
import {
  makeStyles,
  useTheme,
} from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, {
  useEffect,
  useState,
} from 'react';
import {
  Bar,
  Line,
  BarChart,
  CartesianGrid,
  ComposedChart as RechartsComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Counties from './Counties';
import SvgBlankCaliforniaMap from './SvgBlankCaliforniaMap';

function Chart(props) {
  const theme = useTheme();
  const {title, data, dataKey} = props;
  return (
    <>
      <Typography
        component='h2'
        variant='h6'
        color='primary'
        gutterBottom>
        {title}
      </Typography>
      {data &&
        <ResponsiveContainer height='100%' width='100%'>
          <BarChart
            data={data}
            margin={{
              top: theme.spacing(3),
              right: theme.spacing(3),
              bottom: theme.spacing(3),
              left: theme.spacing(3),
            }}>
            <CartesianGrid strokeDasharray="2 2" />
            <XAxis dataKey='date' stroke={theme.palette.text.secondary} angle={-45} textAnchor='end' />
            <YAxis stroke={theme.palette.text.secondary} allowDecimals={false}/>
            <Tooltip />
            <Bar dataKey={dataKey} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      }
    </>
  );
}

function ComposedChart(props) {
  const theme = useTheme();
  const {title, data, primaryDataKey, secondaryDataKey} = props;
  return (
    <>
      <Typography
        component='h2'
        variant='h6'
        color='primary'
        gutterBottom>
        {title}
      </Typography>
      {data &&
        <ResponsiveContainer height='100%' width='100%'>
          <RechartsComposedChart
            data={data}
            margin={{
              top: theme.spacing(3),
              right: theme.spacing(3),
              bottom: theme.spacing(3),
              left: theme.spacing(3),
            }}>
            <CartesianGrid strokeDasharray="2 2" />
            <XAxis dataKey='date' stroke={theme.palette.text.secondary} angle={-45} textAnchor='end' />
            <YAxis stroke={theme.palette.text.secondary} allowDecimals={false}/>
            <Tooltip />
            <Legend verticalAlign='top' height={30} />
            <Bar name={title} dataKey={primaryDataKey} fill="#8884d8" />
            <Line name='5-day Avg' type='monotone' dataKey={secondaryDataKey} stroke='#ff7300' dot={false} />
          </RechartsComposedChart>
        </ResponsiveContainer>
      }
    </>
  );
}

const useStyles = makeStyles((theme) => ({
  appBarSpacer: theme.mixins.toolbar,
  container: {
    width: 960,
    paddingTop: theme.spacing(2),
  },
  selectionPanelSummary: {
    width: 800,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  graphContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 300,
    padding: theme.spacing(2),
  },
}));

function App() {
  const [data, setData] = useState(null);
  const [selectedCounties, setSelectedCounties] = useState(new Set([
    'Alameda',
    'San Francisco',
    'San Mateo',
    'Santa Clara',
  ]));
  const classes = useStyles();
  const counties = Counties.get('CA');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios.get('https://amazingshellyyy.com/covid19-api/US-CA/countyTimeseries.json');
        const rawData = result.data;
        const len = rawData.length;

        const prunedData = [];
        var lastUniqueDate = null;
        for (var i = len - 1; i >= 0; --i) {
          if (lastUniqueDate && dayjs(rawData[i].timeStamp).startOf('day').isSame(lastUniqueDate)) {
            continue;
          }
          lastUniqueDate = dayjs(rawData[i].timeStamp).startOf('day');
          prunedData.push({
            date: lastUniqueDate,
            data: rawData[i].data
          });
        }
        prunedData.reverse();
        setData(prunedData);

        const uniqueCounties = new Set();
        prunedData.forEach((v) => {
          v.data.forEach((d) => uniqueCounties.add(d.county));
        });
        uniqueCounties.forEach((c) => {
          if (!counties.has(c)) {
            console.error(`${c} in data source is not a valid county name.`);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };
    fetchData();
  }, [counties]);

  if (!data) {
    return <CircularProgress />;
  }

  const handleToggleCounty = (county) => {
    const newSet = new Set(selectedCounties);
    if (selectedCounties.has(county)) {
      newSet.delete(county);
    } else {
      newSet.add(county);
    }
    setSelectedCounties(newSet);
  };

  const chartData = [];
  data.forEach((d) => {
    var cases = 0;
    var deaths = 0;
    d.data.forEach((entry) => {
      if (selectedCounties.has(entry.county)) {
        cases += entry.case;
        deaths += entry.death;
      }
    });
    chartData.push({
      date: d.date.format('MM/DD'),
      cases,
      deaths,
    });
  });

  chartData.forEach((d, i, arr) => {
    if (i === 0) {
      arr[i].newCases = 0;
      arr[i].newDeaths = 0;
      arr[i].fiveDayAvgNewCases = 0;
      arr[i].fiveDayAvgNewDeaths = 0;
      return;
    }

    arr[i].newCases = arr[i].cases - arr[i - 1].cases;
    arr[i].newDeaths = arr[i].deaths - arr[i - 1].deaths;

    // Compute 5-day averages.
    var newCases = 0;
    var newDeaths = 0;
    var days = 0;
    for (var j = i; j >= 0 && (i - j) <= 4; --j) {
      newCases += arr[j].newCases;
      newDeaths += arr[j].newDeaths;
      ++days;
    }
    arr[i].fiveDayAvgNewCases = Math.ceil(newCases / days);
    arr[i].fiveDayAvgNewDeaths = Math.ceil(newDeaths / days);
  });

  return (
    <>
      <AppBar elevation={0}>
        <Toolbar>
          <Typography component='h1' variant='h5'>
            Corona Cases
          </Typography>
        </Toolbar>
      </AppBar>
      <main>
        <div className={classes.appBarSpacer} />
        <Container className={classes.container}>
          <Grid container direction='column' wrap='nowrap' spacing={4}>
            <Grid item xs={12}>
              <ExpansionPanel defaultExpanded variant='outlined'>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography className={classes.selectionPanelSummary} noWrap>
                    <b>Selected counties:</b> {Array.from(selectedCounties).sort().join(', ')}
                  </Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <Grid container wrap='nowrap' spacing={2}>
                    <Grid item xs={5}>
                      <Box>
                        <Button
                          color='primary'
                          onClick={() => setSelectedCounties(new Set(counties))}>
                          Select all
                        </Button>
                        <Button
                          color='primary'
                          onClick={() => setSelectedCounties(new Set())}>
                          Clear all
                        </Button>
                      </Box>
                      <Box mb={2}>
                        {Array.from(counties).map((c) => (
                          <Chip
                            className={classes.chip}
                            key={c}
                            label={c}
                            clickable
                            color={selectedCounties.has(c) ? 'primary' : 'default'}
                            onClick={() => handleToggleCounty(c)} />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={7}>
                      <Box pt={4}>
                        <SvgBlankCaliforniaMap
                          selectedCounties={selectedCounties}
                          onToggleCounty={handleToggleCounty} />
                      </Box>
                    </Grid>
                  </Grid>
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </Grid>
            <Grid item xs={12}>
              <Paper className={classes.graphContainer} variant='outlined'>
                <ComposedChart title='New Cases' data={chartData} primaryDataKey='newCases' secondaryDataKey='fiveDayAvgNewCases' />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper className={classes.graphContainer} variant='outlined'>
                <ComposedChart title='New Deaths' data={chartData} primaryDataKey='newDeaths' secondaryDataKey='fiveDayAvgNewDeaths' />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper className={classes.graphContainer} variant='outlined'>
                <Chart title='Total Cases' data={chartData} dataKey='cases' />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper className={classes.graphContainer} variant='outlined'>
                <Chart title='Total Deaths' data={chartData} dataKey='deaths' />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Typography>
                Data source: <Link href='https://github.com/amazingshellyyy/covid19-api'>amazingshellyyy/covid19-api</Link>
              </Typography>
              <Typography>
                California map: <Link href='https://commons.wikimedia.org/wiki/File:Blank_California_Map.svg'>Wikimedia Commons</Link>
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </main>
    </>
  );
}

export default App;
