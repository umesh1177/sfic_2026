"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapController = void 0;
const store_js_1 = require("../data/store.js");
const postgis_js_1 = require("../utils/postgis.js");
const dbRepository_js_1 = require("../data/dbRepository.js");
class MapController {
    /**
     * GET /api/map/wards
     * Returns GeoJSON boundaries of all 13 Navsari wards
     */
    static async getWards(_req, res) {
        try {
            const geoJson = {
                type: 'FeatureCollection',
                features: store_js_1.store.wards.map(w => ({
                    type: 'Feature',
                    properties: {
                        id: w.id,
                        ward_number: w.ward_number,
                        ward_name: w.ward_name,
                        ward_name_gu: w.ward_name_gu,
                        cleanliness_score: w.cleanliness_score,
                        office_address: w.office_address,
                        ward_officer_name: w.ward_officer_name
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [w.boundary_coordinates]
                    }
                }))
            };
            res.status(200).json({
                success: true,
                data: geoJson
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/map/public-complaints
     * Strictly sanitizes data to protect citizen privacy: NO phone, NO email, NO reporter identity
     */
    static async getPublicComplaints(req, res) {
        try {
            const { category_id, status, ward_number } = req.query;
            let list = await dbRepository_js_1.DbRepository.getComplaints({
                category_id: category_id,
                status: status
            });
            if (ward_number) {
                list = list.filter(c => c.location.ward_number === Number(ward_number));
            }
            // Sanitized marker payload
            const sanitizedMarkers = list.map(c => ({
                id: c.id,
                complaint_number: c.complaint_number,
                category_name: c.category_name,
                latitude: c.location.latitude,
                longitude: c.location.longitude,
                ward_number: c.location.ward_number,
                ward_name: c.location.ward_name,
                address: c.location.address,
                landmark: c.location.landmark,
                status: c.status,
                submitted_at: c.submitted_at,
                image_url: c.image_url,
                followers_count: c.followers_count
            }));
            res.status(200).json({
                success: true,
                data: sanitizedMarkers
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/map/hotspots
     * Chronic recurring waste spots in Navsari
     */
    static async getHotspots(_req, res) {
        const hotspots = [
            {
                id: 'hs-01',
                title: 'Junathana Wholesale Vegetable Market Corner',
                ward_number: 9,
                latitude: 20.9580,
                longitude: 72.9450,
                severity: 'high',
                frequency: 'Daily organic waste accumulation',
                cleanup_schedule: 'Twice daily (06:00 & 14:00)'
            },
            {
                id: 'hs-02',
                title: 'Station Road Auto Stand Point',
                ward_number: 2,
                latitude: 20.9470,
                longitude: 72.9440,
                severity: 'medium',
                frequency: 'Plastic bottles and fast food boxes',
                cleanup_schedule: 'Every morning'
            },
            {
                id: 'hs-03',
                title: 'Dudhiya Talao West Drainage Inflow',
                ward_number: 3,
                latitude: 20.9290,
                longitude: 72.9250,
                severity: 'critical',
                frequency: 'Lake edge debris and silt accumulation',
                cleanup_schedule: 'Bi-weekly heavy mechanized cleaning'
            }
        ];
        res.status(200).json({
            success: true,
            data: hotspots
        });
    }
    /**
     * GET /api/map/ward-scores
     */
    static async getWardScores(_req, res) {
        const scores = store_js_1.store.wards.map(w => ({
            ward_number: w.ward_number,
            ward_name: w.ward_name,
            ward_name_gu: w.ward_name_gu,
            score: w.cleanliness_score,
            officer: w.ward_officer_name,
            contact: w.contact_phone
        }));
        res.status(200).json({
            success: true,
            data: scores
        });
    }
    /**
     * GET /api/map/nearby
     */
    static async getNearby(req, res) {
        try {
            const { lat, lng, radius_meters = '1000' } = req.query;
            const latitude = Number(lat);
            const longitude = Number(lng);
            const radius = Number(radius_meters);
            if (isNaN(latitude) || isNaN(longitude)) {
                res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
                return;
            }
            const allComplaints = await dbRepository_js_1.DbRepository.getComplaints();
            const nearby = allComplaints.filter(c => {
                const dist = (0, postgis_js_1.calculateDistanceMeters)(latitude, longitude, c.location.latitude, c.location.longitude);
                return dist <= radius;
            }).map(c => ({
                id: c.id,
                complaint_number: c.complaint_number,
                category_name: c.category_name,
                address: c.location.address,
                latitude: c.location.latitude,
                longitude: c.location.longitude,
                status: c.status,
                submitted_at: c.submitted_at
            }));
            res.status(200).json({
                success: true,
                data: nearby
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.MapController = MapController;
