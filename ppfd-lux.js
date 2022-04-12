var series_i0 = 0;
var series_i1 = 0;
var xhours = 0;     
      // Webpage Javascript to chart multiple ThingSpeak channels on two axis with navigator, load historical data, and export cvs data.
      // Public Domain, by turgo.
      //  The charting library is called HighStock.  It is awesome!  HighSoft, the owners say, 
      //   "Do you want to use Highstock for a personal or non-profit project? Then you can use Highchcarts for 
      //   free under the  Creative Commons Attribution-NonCommercial 3.0 License. "
      // http://forum.arduino.cc/index.php?topic=213058.msg1560990#msg1560990
var dynamicChart;
var channelsLoaded = 0;
// put your ThingSpeak Channel#, Channel Name, and API keys here.
// fieldList shows which field you want to load, and which axis to display that field on, 
// the 'T' Temperature left axis, or the 'O' Other right axis.
var channelKeys =[];
//Change TO: display two fields from the same channel from a Rain gauge - 15min counts, and total counts
//  src="http://api.thingspeak.com/channels/8652/charts/3?width=1300&height=520&results=1000&dynamic=false&title=15minTotals%20(0.5mm)" ></iframe>
channelKeys.push({channelNumber:1614512, name:'PPFD',key:'B30E75CIAH9HH3TJ',
   fieldList:[{field:3,axis:'C'},{field:5,axis:'R'}]});
    
// user's timezone offset
var myOffset = new Date().getTimezoneOffset();

// converts date format from JSON
function getChartDate(d) {
    // get the data using javascript's date object (year, month, day, hour, minute, second)
    // months in javascript start at 0, so remember to subtract 1 when specifying the month
    // offset in minutes is converted to milliseconds and subtracted so that chart's x-axis is correct
    return Date.UTC(d.substring(0,4), d.substring(5,7)-1, d.substring(8,10), d.substring(11,13), d.substring(14,16), d.substring(17,19)) - (myOffset * 60000);
}

      // Hide all series, via 'Hide All' button.  Then user can click on serries name in legent to show series of interest.      
function HideAll(){
  for (var index=0; index<dynamicChart.series.length; index++)  // iterate through each series
  { 
    if (dynamicChart.series[index].name == 'Navigator')
      continue;
    dynamicChart.series[index].hide();
    //window.console && console.log('Series Number:',index,' Name:',dynamicChart.series[index].name);
  }
  //});
            
}
      
      //  This is where the chart is generated.
$(document).ready(function() 
{
	//Add Channel Load Menu
	var menu=document.getElementById("Channel Select");
 
	for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
	{
		window.console && console.log('Name',channelKeys[channelIndex].name);
		var menuOption =new Option(channelKeys[channelIndex].name,channelIndex);
		menu.options.add(menuOption,channelIndex);
	}
 
	var last_date; // variable for the last date added to the chart
	window.console && console.log('Testing console');
 
	//make series numbers for each field
	var seriesCounter=0
	for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
	{
		for (var fieldIndex=0; fieldIndex<channelKeys[channelIndex].fieldList.length; fieldIndex++)  // iterate through each channel
		  {
			channelKeys[channelIndex].fieldList[fieldIndex].series = seriesCounter; 
			seriesCounter++;
		  }
	}

	for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
	{  
               (function(channelIndex)
               {
                // get the data with a webservice call
                $.getJSON('https://api.thingspeak.com/channels/'+channelKeys[channelIndex].channelNumber+'/feed/last.json?offset=0&amp;location=false;key='+channelKeys[channelIndex].key, function(data) 
                { 

                  for (var fieldIndex=0; fieldIndex<channelKeys[channelIndex].fieldList.length; fieldIndex++)
                  {
                    // if data exists
                    var fieldStr = "data.field"+channelKeys[channelIndex].fieldList[fieldIndex].field;
                    var chartSeriesIndex=channelKeys[channelIndex].fieldList[fieldIndex].series;
					if (data && eval(fieldStr)) 
                    {
                      var p = []//new Highcharts.Point();
                      var v = eval(fieldStr);
					  
                      p[0] = getChartDate(data.created_at);
                      p[1] = parseFloat(v);

						var timeDate = new Date(data.created_at);
						console.log(timeDate.getHours());
						
						if(fieldIndex==1)
						{
							var span = document.getElementById("id_cur_hr");
							span.innerText = Math.round(v * 10.0) / 10.0;
							if((timeDate.getHours() == 18)&&(timeDate.getMinutes() < 2))
							{
								xhours = p[1];
							}

							if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)>0))
								p[1] = 1;
							else
								p[1] = 0;
						}	
			
						if(fieldIndex==0)
						{
							if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)!=0)&&(timeDate.getHours() <= (18+xhours)))
							{
								//p[1] = (150+parseFloat(v))/2.0;
								p[1] = 150+(parseFloat(v)*0.020);
							}

							var span = document.getElementById("id_cur_par");
							span.innerText = Math.round(p[1] * 10.0) / 10.0;
						}
						  
                    }

                  }
                });
               })(channelIndex);
	}

	//make calls to load data from each channel into channelKeys array now
	// draw the chart when all the data arrives, later asyncronously add history
	for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
	{
		channelKeys[channelIndex].loaded = false;  
		loadThingSpeakChannel(channelIndex,channelKeys[channelIndex].channelNumber,channelKeys[channelIndex].key,channelKeys[channelIndex].fieldList);
	}
	//window.console && console.log('Channel Keys',channelKeys);
 
 // load the most recent 2500 points (fast initial load) from a ThingSpeak channel into a data[] array and return the data[] array
 function loadThingSpeakChannel(sentChannelIndex,channelNumber,key,sentFieldList) {
	var fieldList= sentFieldList;
	var channelIndex = sentChannelIndex;
	// get the Channel data with a webservice call
 	$.getJSON('https://api.thingspeak.com/channels/'+channelNumber+'/feed.json?&offset=0&results=2500;key='+key, function(data)
	{
		// if no access
		if (data == '-1') {
			$('#chart-container').append('This channel is not public.  To embed charts, the channel must be public or a read key must be specified.');
			window.console && console.log('Thingspeak Data Loading Error');
		}
		else 
		{
		 
			xhours = 0;
			
			for (var fieldIndex=0; fieldIndex<fieldList.length; fieldIndex++)  // iterate through each field
			{
			fieldList[fieldIndex].data =[];
			for (var h=0; h<data.feeds.length; h++)  // iterate through each feed (data point)
			{
				var p = []//new Highcharts.Point();
				var fieldStr = "data.feeds["+h+"].field"+fieldList[fieldIndex].field;
			 
				var v = eval(fieldStr);
				p[0] = getChartDate(data.feeds[h].created_at);
				p[1] = parseFloat(v);
				
				var timeDate = new Date(data.feeds[h].created_at);
				console.log(p[1]);
				
				if(fieldIndex==1)
				{
					if((timeDate.getHours() == 18)&&(timeDate.getMinutes() < 2))
					{
						xhours = p[1];
					}
					
					if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)>0))
					{
						p[1] = 1;
						p[2] = xhours;
					}
					else
					{
						p[1] = 0;
						p[2] = 0;
					}
				}	
				
				if(fieldIndex==0)
				{
					if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)!=0)&&(timeDate.getHours() <= (18+xhours)))
					{
						//p[1] = (150+parseFloat(v))/2.0;
						p[1] = 150+(parseFloat(v)*0.020);
					}
				}
				
				if ((!isNaN(parseInt(v)))&&(parseInt(v)<150000)) { fieldList[fieldIndex].data.push(p); }
			}
			fieldList[fieldIndex].name = eval("data.channel.field"+fieldList[fieldIndex].field);
			}
		   
			window.console && console.log('getJSON field name:',fieldList[0].name);
			channelKeys[channelIndex].fieldList=fieldList;
			channelKeys[channelIndex].loaded=true;
			channelsLoaded++;
			window.console && console.log('channels Loaded:',channelsLoaded);
			window.console && console.log('channel index:',channelIndex);
			if (channelsLoaded==channelKeys.length){createChart();}
		}
	})
	.fail(function() { alert('getJSON request failed! '); });
 }
 
 // create the chart when all data is loaded
 function createChart() {
	// specify the chart options
	var chartOptions = {
	  chart: 
    {
		  renderTo: 'chart-container',
      zoomType:'y',
			events: 
      {
        load: function() 
        {
				  if ('true' === 'true' && (''.length < 1 && ''.length < 1 && ''.length < 1 && ''.length < 1 && ''.length < 1)) 
          {
            // If the update checkbox is checked, get latest data every 15 seconds and add it to the chart
			setInterval(function() 
            {
             if (document.getElementById("Update").checked)
             {
				xhours = 0;
              for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
              {  
               (function(channelIndex)
               {
                // get the data with a webservice call
                $.getJSON('https://api.thingspeak.com/channels/'+channelKeys[channelIndex].channelNumber+'/feed/last.json?offset=0&amp;location=false;key='+channelKeys[channelIndex].key, function(data) 
                { 

                  for (var fieldIndex=0; fieldIndex<channelKeys[channelIndex].fieldList.length; fieldIndex++)
                  {
                    // if data exists
                    var fieldStr = "data.field"+channelKeys[channelIndex].fieldList[fieldIndex].field;
                    var chartSeriesIndex=channelKeys[channelIndex].fieldList[fieldIndex].series;
                    if (data && eval(fieldStr)) 
                    {
                      var p = []//new Highcharts.Point();
                      var v = eval(fieldStr);
					  
                      p[0] = getChartDate(data.created_at);
                      p[1] = parseFloat(v);

						var timeDate = new Date(data.created_at);
						console.log(timeDate.getHours());
						
						if(fieldIndex==1)
						{
							var span = document.getElementById("id_cur_hr");
							span.innerText = Math.round(v * 10.0) / 10.0;
							if((timeDate.getHours() == 18)&&(timeDate.getMinutes() < 2))
							{
								xhours = p[1];
							}

							if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)>0))
							{
								p[1] = 1;
								p[2] = xhours;
							}
							else
							{
								p[1] = 0;
								p[2] = 0;
							}
						}	
			
						if(fieldIndex==0)
						{
							if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)!=0)&&(timeDate.getHours() <= (18+xhours)))
							{
								//p[1] = (150+parseFloat(v))/2.0;
								p[1] = 150+(parseFloat(v)*0.020);
							}

							var span = document.getElementById("id_cur_par");
							span.innerText = Math.round(p[1] * 10.0) / 10.0;
						}
						
                      // get the last date if possible
                      if (dynamicChart.series[chartSeriesIndex].data.length > 0) 
                      { 
                        last_date = dynamicChart.series[chartSeriesIndex].data[dynamicChart.series[chartSeriesIndex].data.length-1].x; 
                      }
                      var shift = false ; //default for shift
                      // if a numerical value exists and it is a new date, add it
                      if (!isNaN(parseInt(v)) && (p[0] != last_date)&&(parseInt(v)<150000)) 
                      {
                        dynamicChart.series[chartSeriesIndex].addPoint(p, true, shift);
                      }   
                    }
                  }
                  
                  
                });
               })(channelIndex);
              }
             }
						}, 15000);
					}
				},
				
    	render: function(){
			Highcharts.each(this.series, function(s){
				if(!s.visible){
				console.log(s.name + ' is not visible!');
				if(s.name == 'Supplemental Hours')
				series_i0 = 1;
				if(s.name == 'PPFD')
				series_i1 = 1;
				}
				else{
				if(s.name == 'Supplemental Hours')
				series_i0 = 0;
				if(s.name == 'PPFD')
				series_i1 = 0;
				}
			});
		}


			}
	},
	function(chart) {
   
		labelText = 'Series 1, y: <br/>Series 2, y: ';

		chart.renderer.text(labelText, 80, 80)
			.attr({
				zIndex: 5
			})
			.css({
				fontSize: '12px'
			})
			.add();

			chart.renderer.rect(75, 65, 135, 40, 2)
			.attr({
				'stroke-width': 2,
				stroke: 'black',
				fill: '#CEF74A',
				zIndex: 4
			})
			.add();
	},
		rangeSelector: {
			buttons: [{
				count: 30,
				type: 'minute',
				text: '30M'
			}, {
				count: 12,
				type: 'hour',
				text: '12H'
      }, {
				count: 1,
				type: 'day',
				text: 'D'
      }, {
				count: 1,
				type: 'week',
				text: 'W'
      }, {
				count: 1,
				type: 'month',
				text: 'M'
      }, {
				count: 1,
				type: 'year',
				text: 'Y'
			}, {
				type: 'all',
				text: 'All'
			}],
			inputEnabled: true,
			selected: 4  //Change to 4th button as default
		},
    title: {
			text: ''
		},
		plotOptions: {
		  line: {
        gapSize:5
				//color: '#d62020'
				//  },
				//  bar: {
				//color: '#d52020'
				//  },
				//  column: {
			},
			series: {
			  marker: {
				  radius: 2
				},
				animation: true,
				step: false,
				turboThrehold:1000,
				borderWidth: 0
			}
		},
    tooltip: {
      //valueDecimals: 1,
      //valueSuffix: '',
      //xDateFormat:'%Y-%m-%d<br/>%H:%M:%S %p' //bug fix

		formatter: function() {
		var chartdata = 0;
		var chartSeries1 = series_i0;
		var chartSeries2 = series_i1;
		//console.log(chartdata[2]);
		var tooltip = Highcharts.dateFormat('%A %b %e, %Y %H:%M:%S', new Date(this.x));
		if(((chartSeries1==0)&&(chartSeries2==0)))
		{
			var chartdata = chartOptions.series[1].data[this.points[1].point.dataGroup.start];
			const  theValue1 = this.points[1].y;
			tooltip += '<br><b>LED Status: </b>';
			
			if(theValue1 == 1)
			{
				tooltip += '<b>ON</b>';
				tooltip += '<br><b>Supplemental Hours: ' + chartdata[2] + '</b>';
			}
			else
			{
				tooltip += '<b>OFF</b>';
			}
			const  theValue0 = this.points[0].y;
				
			tooltip += '<br><b>PAR Value: ' + theValue0 + '</b>';
		}
		else if(((chartSeries1==0)&&(chartSeries2==1)))
		{
			var chartdata = chartOptions.series[1].data[this.points[0].point.dataGroup.start];
			const  theValue1 = this.points[0].y;
			tooltip += '<br><b>LED Status: </b>';
			
			if(theValue1 == 1)
			{
				tooltip += '<b>ON</b>';
				tooltip += '<br><b>Supplemental Hours: ' + chartdata[2] + '</b>';
			}
			else
			{
				tooltip += '<b>OFF</b>';
			}
			//const  theValue0 = this.points[0].y;
				
			//tooltip += '<br><b>PAR Value: ' + theValue0 + '</b>';
		}
		else
		{
			var chartdata = chartOptions.series[0].data[this.points[0].point.dataGroup.start];
			const  theValue0 = this.points[0].y;
				
			tooltip += '<br><b>PAR Value: ' + theValue0 + '</b>';
		}

		
		return tooltip;
		}

    },
		xAxis: {
		  type: 'datetime',
      ordinal:false,
      min: Date.UTC(2013,02,28),
			dateTimeLabelFormats : {
        hour: '%l %p',
        minute: '%l:%M %p'
      },
      title: {
        text: 'LeftAxis'
			}
		},
		yAxis: [{
            title: {
                text: 'LED Status'
            },
            id: 'R'
    }, {
            title: {
                text: 'ppfd unit'
            },
            opposite: true,
            id: 'C'
    }],
		exporting: {
		  enabled: true,
      csv: {
        dateFormat: '%d/%m/%Y %I:%M:%S %p'
        }
		},
		legend: {
		  enabled: true
		},
    navigator: {
      baseSeries: 0,  //select which series to show in history navigator, First series is 0
      series: {
            includeInCSVExport: false
        }
		},    
    series: []
    //series: [{data:[[getChartDate("2013-06-16T00:32:40Z"),75]]}]      
	};

	// add all Channel data to the chart
  for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
  {
    for (var fieldIndex=0; fieldIndex<channelKeys[channelIndex].fieldList.length; fieldIndex++)  // add each field
    {
      window.console && console.log('Channel '+channelIndex+' field '+fieldIndex);
      chartOptions.series.push({data:channelKeys[channelIndex].fieldList[fieldIndex].data,
                                index:channelKeys[channelIndex].fieldList[fieldIndex].series,
                                yAxis:channelKeys[channelIndex].fieldList[fieldIndex].axis,
                                //visible:false,
                              name: channelKeys[channelIndex].fieldList[fieldIndex].name});
    }
  }
	// set chart labels here so that decoding occurs properly
	//chartOptions.title.text = data.channel.name;
	chartOptions.xAxis.title.text = 'Date';

	// draw the chart
  dynamicChart = new Highcharts.StockChart(chartOptions);

  // update series number to account for the navigator series (The historical series at the bottom) which is the first series.
  for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
  {
    for (var fieldIndex=0; fieldIndex<channelKeys[channelIndex].fieldList.length; fieldIndex++)  // and each field
    {
      for (var seriesIndex=0; seriesIndex<dynamicChart.series.length; seriesIndex++)  // compare each series name
      {
        if (dynamicChart.series[seriesIndex].name == channelKeys[channelIndex].fieldList[fieldIndex].name)
        {
          channelKeys[channelIndex].fieldList[fieldIndex].series = seriesIndex;
        }
      }
    }
  }          
  // add all history
  //dynamicChart.showLoading("Loading History..." );
  window.console && console.log('Channels: ',channelKeys.length);
  for (var channelIndex=0; channelIndex<channelKeys.length; channelIndex++)  // iterate through each channel
  {
    window.console && console.log('channelIndex: ',channelIndex);
    (function(channelIndex)
      {
        //load only 1 set of 8000 points
        loadChannelHistory(channelIndex,channelKeys[channelIndex].channelNumber,channelKeys[channelIndex].key,channelKeys[channelIndex].fieldList,0,1); 
      }
    )(channelIndex);
  }
  loadOneChannel();
 }
 
});
      
function loadOneChannel(){ 
  // load a channel selected in the popUp menu.
  var selectedChannel=document.getElementById("Channel Select");
  var maxLoads=document.getElementById("Loads").value ;
  var channelIndex = selectedChannel.selectedIndex;
  loadChannelHistory(channelIndex,channelKeys[channelIndex].channelNumber,channelKeys[channelIndex].key,channelKeys[channelIndex].fieldList,0,maxLoads); 
} 

// load next 8000 points from a ThingSpeak channel and addPoints to a series
function loadChannelHistory(sentChannelIndex,channelNumber,key,sentFieldList,sentNumLoads,maxLoads) {
   var numLoads=sentNumLoads
   var fieldList= sentFieldList;
   var channelIndex = sentChannelIndex;
   var first_Date = new Date();
   if (typeof fieldList[0].data[0] != "undefined") first_Date.setTime(fieldList[0].data[0][0]+7*60*60*1000);//adjust for 7 hour difference from GMT (Zulu time)
   else if (typeof fieldList[1].data[0] != "undefined") first_Date.setTime(fieldList[1].data[0][0]+7*60*60*1000);
   else if (typeof fieldList[2].data[0] != "undefined") first_Date.setTime(fieldList[2].data[0][0]+7*60*60*1000);
   else if (typeof fieldList[3].data[0] != "undefined") first_Date.setTime(fieldList[3].data[0][0]+7*60*60*1000);
   else if (typeof fieldList[4].data[0] != "undefined") first_Date.setTime(fieldList[4].data[0][0]+7*60*60*1000);
   else if (typeof fieldList[5].data[0] != "undefined") first_Date.setTime(fieldList[5].data[0][0]+7*60*60*1000);
   else if (typeof fieldList[6].data[0] != "undefined") first_Date.setTime(fieldList[6].data[0][0]+7*60*60*1000);
   else if (typeof fieldList[7].data[0] != "undefined") first_Date.setTime(fieldList[7].data[0][0]+7*60*60*1000);
   var end = first_Date.toJSON();
   window.console && console.log('earliest date:',end);
   window.console && console.log('sentChannelIndex:',sentChannelIndex);
   window.console && console.log('numLoads:',numLoads);
   // get the Channel data with a webservice call
 	$.getJSON('https://api.thingspeak.com/channels/'+channelNumber+'/feed.json?offset=0&amp;start=2021-12-30T00:00:00;end='+end+';key='+key, function(data) 
   {
	   // if no access
	   if (data == '-1') {
       $('#chart-container').append('This channel is not public.  To embed charts, the channel must be public or a read key must be specified.');
       window.console && console.log('Thingspeak Data Loading Error');
		}
		else{
			xhours = 0;

     for (var fieldIndex=0; fieldIndex<fieldList.length; fieldIndex++)  // iterate through each field
     {
       //fieldList[fieldIndex].data =[];
       for (var h=0; h<data.feeds.length; h++)  // iterate through each feed (data point)
       {
         var p = []//new Highcharts.Point();
         var fieldStr = "data.feeds["+h+"].field"+fieldList[fieldIndex].field;
		  	 var v = eval(fieldStr);
 		  	p[0] = getChartDate(data.feeds[h].created_at);
	 	  	p[1] = parseFloat(v);
			var timeDate = new Date(data.feeds[h].created_at);
			console.log(timeDate.getHours());
			if(fieldIndex==1)
			{
				if((timeDate.getHours() == 18)&&(timeDate.getMinutes() < 2))
				{
					xhours = p[1];
				}
				if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)>0))
					{
						p[1] = 1;
						p[2] = xhours;
					}
					else
					{
						p[1] = 0;
						p[2] = 0;
					}
			}	

			if(fieldIndex==0)
			{
				if(((timeDate.getHours() >= 18)||(timeDate.getHours() <= 5))&&(parseFloat(v)!=0)&&(timeDate.getHours() <= (18+xhours)))
				{
					//p[1] = (150+parseFloat(v))/2.0;
					p[1] = 150+(parseFloat(v)*0.020);
				}
			}
			
	 	  	// if a numerical value exists add it
	   		if (!isNaN(parseInt(v))&&(parseInt(v)<150000)) { fieldList[fieldIndex].data.push(p); }
       }
       fieldList[fieldIndex].data.sort(function(a,b){return a[0]-b[0]});
       dynamicChart.series[fieldList[fieldIndex].series].setData(fieldList[fieldIndex].data,false);
       //dynamicChart.series[fieldList[fieldIndex].series].addPoint(fieldList[fieldIndex].data,false);
       //fieldList[fieldIndex].name = eval("data.channel.field"+fieldList[fieldIndex].field);
       //window.console && console.log('data added to series:',fieldList[fieldIndex].series,fieldList[fieldIndex].data);
	   }
     channelKeys[channelIndex].fieldList=fieldList;
     dynamicChart.redraw()
     window.console && console.log('channel index:',channelIndex);
     numLoads++;
     if (numLoads<maxLoads) {loadChannelHistory(channelIndex,channelNumber,key,fieldList,numLoads,maxLoads);}
	 }
	 });
}
