"""
Audit App Evaluation Framework
Evaluates audit completion accuracy, data sync reliability, and navigation flow
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class AuditEvaluationMetrics:
    """Metrics for evaluating audit completion accuracy"""
    
    def __init__(self):
        self.results = {
            'audit_completion_accuracy': [],
            'data_sync_reliability': [],
            'category_navigation_flow': []
        }
    
    def evaluate_audit_completion(self, audit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate if audit is completed correctly with all required fields
        """
        score = 100
        issues = []
        
        # Check if all mandatory items are present
        if not audit_data.get('items') or len(audit_data['items']) == 0:
            score -= 50
            issues.append("No items found in audit")
        
        # Validate each item
        for item in audit_data.get('items', []):
            if not item.get('item_id'):
                score -= 10
                issues.append(f"Item missing ID")
            
            if not item.get('category'):
                score -= 10
                issues.append(f"Item {item.get('item_id')} missing category")
            
            if 'response' not in item:
                score -= 15
                issues.append(f"Item {item.get('item_id')} missing response")
            
            # Validate response format
            valid_responses = ['yes', 'no', 'na', 'partial']
            if item.get('response') not in valid_responses:
                score -= 15
                issues.append(f"Item {item.get('item_id')} has invalid response: {item.get('response')}")
        
        # Check for required metadata
        if not audit_data.get('audit_id'):
            score -= 10
            issues.append("Audit missing ID")
        
        if not audit_data.get('user_id'):
            score -= 10
            issues.append("Audit missing user ID")
        
        if not audit_data.get('restaurant_id'):
            score -= 10
            issues.append("Audit missing restaurant ID")
        
        score = max(0, min(100, score))
        
        result = {
            'test_id': audit_data.get('audit_id', 'unknown'),
            'score': score,
            'passed': score >= 80,
            'issues': issues,
            'timestamp': datetime.now().isoformat()
        }
        
        self.results['audit_completion_accuracy'].append(result)
        return result
    
    def evaluate_data_sync(self, submission: Dict[str, Any], backend_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate if submitted data is accurately synced to backend
        """
        score = 100
        issues = []
        
        # Check if submission received in backend
        if not backend_result.get('received'):
            score -= 100
            issues.append("Submission not received in backend")
            return {
                'test_id': submission.get('audit_id', 'unknown'),
                'score': 0,
                'passed': False,
                'issues': issues,
                'timestamp': datetime.now().isoformat()
            }
        
        # Validate item counts match
        submitted_count = len(submission.get('items', []))
        backend_count = len(backend_result.get('items', []))
        if submitted_count != backend_count:
            score -= 30
            issues.append(f"Item count mismatch: submitted {submitted_count}, received {backend_count}")
        
        # Validate timestamps
        if submission.get('completion_time') and backend_result.get('received_time'):
            submitted_ts = submission.get('completion_time')
            received_ts = backend_result.get('received_time')
            if abs(submitted_ts - received_ts) > 5000:  # 5 second tolerance
                score -= 20
                issues.append(f"Timestamp mismatch: {abs(submitted_ts - received_ts)}ms difference")
        
        # Check for data corruption
        for i, submitted_item in enumerate(submission.get('items', [])):
            backend_item = backend_result.get('items', [{}])[i] if i < len(backend_result.get('items', [])) else {}
            
            if submitted_item.get('response') != backend_item.get('response'):
                score -= 15
                issues.append(f"Data corruption in item {i}: {submitted_item.get('response')} != {backend_item.get('response')}")
        
        score = max(0, min(100, score))
        
        result = {
            'test_id': submission.get('audit_id', 'unknown'),
            'score': score,
            'passed': score >= 80,
            'issues': issues,
            'sync_latency_ms': backend_result.get('received_time', 0) - submission.get('completion_time', 0),
            'timestamp': datetime.now().isoformat()
        }
        
        self.results['data_sync_reliability'].append(result)
        return result
    
    def evaluate_navigation_flow(self, navigation_events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluate if category navigation flow is correct and smooth
        """
        score = 100
        issues = []
        
        if not navigation_events:
            score -= 100
            issues.append("No navigation events recorded")
            return {
                'test_id': 'unknown',
                'score': 0,
                'passed': False,
                'issues': issues,
                'timestamp': datetime.now().isoformat()
            }
        
        # Check if navigation follows logical order
        prev_category = None
        for event in navigation_events:
            if 'category' not in event:
                score -= 10
                issues.append("Navigation event missing category")
                continue
            
            current_category = event.get('category')
            # In a real scenario, you'd check against your defined category order
            prev_category = current_category
        
        # Check for state loss (gaps in navigation)
        if len(navigation_events) > 0:
            for event in navigation_events:
                if event.get('state_lost'):
                    score -= 25
                    issues.append(f"State loss at {event.get('timestamp')}")
        
        # Check progress updates
        progress_updates = [e for e in navigation_events if e.get('type') == 'progress_update']
        if not progress_updates:
            score -= 20
            issues.append("No progress updates recorded")
        
        score = max(0, min(100, score))
        
        result = {
            'test_id': navigation_events[0].get('audit_id', 'unknown') if navigation_events else 'unknown',
            'score': score,
            'passed': score >= 80,
            'navigation_count': len(navigation_events),
            'issues': issues,
            'timestamp': datetime.now().isoformat()
        }
        
        self.results['category_navigation_flow'].append(result)
        return result
    
    def generate_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive evaluation report
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {},
            'detailed_results': self.results
        }
        
        # Calculate summary metrics
        for metric_name, metric_results in self.results.items():
            if metric_results:
                passed = sum(1 for r in metric_results if r.get('passed'))
                total = len(metric_results)
                avg_score = sum(r.get('score', 0) for r in metric_results) / total if total > 0 else 0
                
                report['summary'][metric_name] = {
                    'total_tests': total,
                    'passed': passed,
                    'failed': total - passed,
                    'pass_rate': f"{(passed/total*100):.1f}%" if total > 0 else "0%",
                    'average_score': f"{avg_score:.1f}"
                }
        
        return report


def run_evaluation(config_path: str = 'evaluation_config.json',
                   queries_path: str = 'test_queries.json'):
    """
    Run full evaluation suite
    """
    print("🧪 Starting Audit App Evaluation Framework")
    print("=" * 60)
    
    # Load configuration
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        print(f"✓ Loaded evaluation config from {config_path}")
    except Exception as e:
        print(f"✗ Failed to load config: {e}")
        return
    
    # Load test queries
    try:
        with open(queries_path, 'r') as f:
            test_queries = json.load(f)
        print(f"✓ Loaded {len(test_queries)} test queries from {queries_path}")
    except Exception as e:
        print(f"✗ Failed to load test queries: {e}")
        return
    
    # Initialize metrics
    metrics = AuditEvaluationMetrics()
    
    print("\n📊 Evaluation Metrics:")
    for metric in config['evaluation_metrics']:
        print(f"  • {metric['name']}: {metric['description']}")
    
    print("\n📝 Test Scenarios:")
    for scenario in test_queries[:3]:  # Show first 3
        print(f"  • {scenario['query_id']}: {scenario['scenario']}")
    
    print(f"\n  ... and {len(test_queries) - 3} more test scenarios")
    
    print("\n✅ Evaluation Framework Ready!")
    print("\nTo run evaluations:")
    print("  1. Execute audit scenarios with test_queries.json")
    print("  2. Capture API responses and sync results")
    print("  3. Call metrics.evaluate_audit_completion()")
    print("  4. Call metrics.evaluate_data_sync()")
    print("  5. Call metrics.evaluate_navigation_flow()")
    print("  6. Call metrics.generate_report()")
    
    # Save sample report
    sample_report = metrics.generate_report()
    report_path = 'evaluation_report.json'
    with open(report_path, 'w') as f:
        json.dump(sample_report, f, indent=2)
    print(f"\n📄 Sample report saved to {report_path}")
    
    return metrics


if __name__ == '__main__':
    metrics = run_evaluation()
    
    # Example: Evaluate a sample audit
    sample_audit = {
        'audit_id': 'AUD_001',
        'user_id': 'USER_123',
        'restaurant_id': 'REST_001',
        'items': [
            {'item_id': 'i1', 'category': 'Greeting', 'response': 'yes'},
            {'item_id': 'i2', 'category': 'Seating', 'response': 'yes'},
        ]
    }
    
    result = metrics.evaluate_audit_completion(sample_audit)
    print(f"\n📋 Sample Audit Evaluation Result:")
    print(f"   Score: {result['score']}/100")
    print(f"   Passed: {result['passed']}")
    if result['issues']:
        print(f"   Issues: {', '.join(result['issues'][:3])}")
