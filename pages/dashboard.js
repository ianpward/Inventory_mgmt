import { useEffect, useState, useRef } from "react";
import  *  as  Realm  from  "realm-web";
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';
import styles from '../styles/dashboard.module.css';

const Dashboard = ({ realmAppId, baseUrl, dashboardId, databaseName }) => {
    const channelOptions = ['Online', 'In-store'];
    const [selectedChannel, setSelectedChannel] = useState('All'); // Default to 'All'
    const [menuOpen, setMenuOpen] = useState(false);
    const [filterName, setFilterName] = useState("Channel"); // Initial filter name
    const  app = new  Realm.App({ id: realmAppId });

    const sdk = new ChartsEmbedSDK({ baseUrl: baseUrl });
    const dashboardDiv = useRef(null);
    const [rendered, setRendered] = useState(false);
    const [dashboard] = useState(sdk.createDashboard({ 
        dashboardId: dashboardId,
        widthMode: 'scale', 
        heightMode: 'scale', 
        background: '#fff'
    }));

    useEffect(() => {
      dashboard.render(dashboardDiv.current).then(() => setRendered(true)).catch(err => console.log("Error during Charts rendering.", err));

      if (dashboardDiv.current) {
        dashboardDiv.current.style.height = "900px"; 
    }
    }, [dashboard]);

    useEffect(() => {
      if (selectedChannel === 'All') {
        setFilterName("Channel");
      } else {
        setFilterName(selectedChannel);
      }
    }, [selectedChannel]);

    useEffect(() => {
      const  login = async () => {
      
          await app.logIn(Realm.Credentials.anonymous());
          const mongodb = app.currentUser.mongoClient("mongodb-atlas");
          const collection = mongodb.db(databaseName).collection("sales");
          
          for await (const  change  of  collection.watch({})) {
            dashboard.refresh();
          }
      }
      login();
  }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleChannelChange = (value) => {
        setSelectedChannel(value);
        toggleMenu();
        dashboard.setFilter({ "channel": value }).catch(err => console.log("Error while filtering.", err));
    };
    
    const handleClearFilters = () => {
        setSelectedChannel('All');
        setFilterName('Channel');
        dashboard.setFilter({}).catch(err => console.log("Error while clearing filters.", err));
    };

  return (
    <div className="App">
        <div className="dashboard-container">
            <div className="filters">
                <div className="filter-buttons">
                    <button className="clear-filters-button" onClick={handleClearFilters}>
                        Clear Filters
                    </button>
                    <div className="dropdown">
                        <button className="dropdown-toggle" onClick={toggleMenu}>
                            {filterName}
                            <span className={`chevron ${menuOpen ? "up" : "down"}`}>&#9660;</span>
                        </button>
                        {menuOpen && (
                            <div className="dropdown-menu">
                            {channelOptions.map(option => {
                                const value = option.toLowerCase();
                                return (
                                    <div className="radio-option" key={value}>
                                        <input
                                            type="radio"
                                            name="channel"
                                            value={value}
                                            onChange={() => handleChannelChange(value)}
                                            checked={value === selectedChannel}
                                        />
                                        
                                        <label htmlFor={value} title={option}>
                                            {option}
                                        </label>
                                        
                                    </div>
                                );
                            })}
                        </div>
                    )}
          </div>
        </div>
      </div>
      <div className={styles["dashboard"]} ref={dashboardDiv}/>
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  try {

    if (!process.env.REALM_APP_ID) {
      throw new Error('Invalid/Missing environment variables: "REALM_APP_ID"')
    }
    if (!process.env.CHARTS_EMBED_SDK_BASEURL) {
      throw new Error('Invalid/Missing environment variables: "CHARTS_EMBED_SDK_BASEURL"')
    }
    if (!process.env.DASHBOARD_ID_GENERAL) {
      throw new Error('Invalid/Missing environment variables: "DASHBOARD_ID_GENERAL"')
    }
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;
    const realmAppId = process.env.REALM_APP_ID;
    const baseUrl = process.env.CHARTS_EMBED_SDK_BASEURL;
    const dashboardId = process.env.DASHBOARD_ID_GENERAL;

    return {
        props: { realmAppId: realmAppId, baseUrl: baseUrl, dashboardId: dashboardId, databaseName: dbName },
    };
  } catch (e) {
    console.error(e);
    return { props: {ok: false, reason: "Server error"}};
  }
}

export default Dashboard;








    