import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import IllustrationGenerator from "./IllustrationGenerator";

import AdEditor from "./AdEditor";

import MockupMaster from "./MockupMaster";

import VideoStoryboard from "./VideoStoryboard";

import BillboardPlacements from "./BillboardPlacements";

import Gallery from "./Gallery";

import BrandKits from "./BrandKits";

import VideoGenerator from "./VideoGenerator";

import AITools from "./AITools";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    IllustrationGenerator: IllustrationGenerator,
    
    AdEditor: AdEditor,
    
    MockupMaster: MockupMaster,
    
    VideoStoryboard: VideoStoryboard,
    
    BillboardPlacements: BillboardPlacements,
    
    Gallery: Gallery,
    
    BrandKits: BrandKits,
    
    VideoGenerator: VideoGenerator,
    
    AITools: AITools,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/IllustrationGenerator" element={<IllustrationGenerator />} />
                
                <Route path="/AdEditor" element={<AdEditor />} />
                
                <Route path="/MockupMaster" element={<MockupMaster />} />
                
                <Route path="/VideoStoryboard" element={<VideoStoryboard />} />
                
                <Route path="/BillboardPlacements" element={<BillboardPlacements />} />
                
                <Route path="/Gallery" element={<Gallery />} />
                
                <Route path="/BrandKits" element={<BrandKits />} />
                
                <Route path="/VideoGenerator" element={<VideoGenerator />} />
                
                <Route path="/AITools" element={<AITools />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}