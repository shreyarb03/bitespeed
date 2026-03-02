#!/bin/bash

# Bitespeed Identity Reconciliation - Test Helper Script
# This script provides utilities for testing the API with custom test cases

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/identify"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to make API call and format response
api_call() {
    local email=$1
    local phone=$2
    local description=$3
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "$description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Build JSON payload
    local payload="{"
    if [ ! -z "$email" ]; then
        payload="$payload\"email\": \"$email\""
    fi
    if [ ! -z "$phone" ]; then
        if [ ! -z "$email" ]; then
            payload="$payload, "
        fi
        payload="$payload\"phoneNumber\": \"$phone\""
    fi
    payload="$payload}"
    
    echo "Request: $payload"
    echo ""
    
    # Make API call
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    # Extract HTTP code and body
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Check if jq is available
    if command -v jq &> /dev/null; then
        echo "Response (Status: $HTTP_CODE):"
        echo "$BODY" | jq '.'
    else
        echo "Response (Status: $HTTP_CODE):"
        echo "$BODY"
        print_warning "Install 'jq' for better JSON formatting: brew install jq"
    fi
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "Request successful"
    else
        print_error "Request failed with status $HTTP_CODE"
    fi
}

# Function to view database
view_database() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "Current Database State"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    sqlite3 prisma/dev.db <<EOF
.mode column
.headers on
SELECT id, email, phoneNumber, linkedId, linkPrecedence, 
       substr(createdAt, 1, 19) as created 
FROM Contact 
ORDER BY COALESCE(linkedId, id), id;
EOF
}

# Function to reset database
reset_database() {
    echo ""
    print_warning "Resetting database..."
    
    if [ -f "prisma/dev.db" ]; then
        rm prisma/dev.db
        print_success "Database deleted"
    fi
    
    npx prisma migrate deploy > /dev/null 2>&1
    print_success "Database recreated and migrated"
    echo ""
}

# Function to check if server is running
check_server() {
    if curl -s -o /dev/null -w "%{http_code}" $BASE_URL > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║   Bitespeed Identity Reconciliation - Test Helper     ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "1) Create new contact (email + phone)"
    echo "2) Create contact (email only)"
    echo "3) Create contact (phone only)"
    echo "4) Add new email to existing phone"
    echo "5) Add new phone to existing email"
    echo "6) Query by email"
    echo "7) Query by phone"
    echo "8) View database"
    echo "9) Reset database"
    echo "0) Exit"
    echo ""
}

# Interactive mode
interactive_mode() {
    # Check if server is running
    if ! check_server; then
        print_error "Server is not running!"
        print_info "Please start the server with: npm start"
        exit 1
    fi
    
    print_success "Server is running"
    
    while true; do
        show_menu
        read -p "Select option: " choice
        
        case $choice in
            1)
                read -p "Enter email: " email
                read -p "Enter phone: " phone
                api_call "$email" "$phone" "Creating new contact with email and phone"
                ;;
            2)
                read -p "Enter email: " email
                api_call "$email" "" "Creating contact with email only"
                ;;
            3)
                read -p "Enter phone: " phone
                api_call "" "$phone" "Creating contact with phone only"
                ;;
            4)
                read -p "Enter new email: " email
                read -p "Enter existing phone: " phone
                api_call "$email" "$phone" "Adding new email to existing phone"
                ;;
            5)
                read -p "Enter existing email: " email
                read -p "Enter new phone: " phone
                api_call "$email" "$phone" "Adding new phone to existing email"
                ;;
            6)
                read -p "Enter email to query: " email
                api_call "$email" "" "Querying by email"
                ;;
            7)
                read -p "Enter phone to query: " phone
                api_call "" "$phone" "Querying by phone"
                ;;
            8)
                view_database
                ;;
            9)
                read -p "Are you sure you want to reset the database? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    reset_database
                else
                    print_info "Reset cancelled"
                fi
                ;;
            0)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
        
        read -p "Press Enter to continue..."
    done
}

# Run demo test suite
run_demo() {
    print_info "Running demo test suite..."
    
    reset_database
    
    api_call "alice@example.com" "1234567890" "Test 1: Create first contact"
    sleep 1
    
    api_call "alice.work@example.com" "1234567890" "Test 2: Add new email"
    sleep 1
    
    api_call "alice@example.com" "9876543210" "Test 3: Add new phone"
    sleep 1
    
    api_call "bob@example.com" "5555555555" "Test 4: Create second primary contact"
    sleep 1
    
    api_call "alice@example.com" "5555555555" "Test 5: Merge two primary contacts"
    sleep 1
    
    view_database
    
    echo ""
    print_success "Demo completed!"
}

# Parse command line arguments
if [ "$1" = "demo" ]; then
    run_demo
elif [ "$1" = "reset" ]; then
    reset_database
elif [ "$1" = "view" ]; then
    view_database
elif [ "$1" = "help" ]; then
    echo "Usage: ./test-helper.sh [command]"
    echo ""
    echo "Commands:"
    echo "  (no args)  - Interactive mode"
    echo "  demo       - Run demo test suite"
    echo "  reset      - Reset database"
    echo "  view       - View database contents"
    echo "  help       - Show this help"
else
    interactive_mode
fi
